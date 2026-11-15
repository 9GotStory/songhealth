# #287 evidence: Feature 009 (the News lists and the Post page) on the development runtime

Feature 009's evidence round (spec #280), run on 2026-11-14 and 2026-11-15 by Claude Code at
`fb11b3e`, the head of `009-news-post-redesign`, and the Product Owner's walkthrough of
2026-11-15. This is a self-run record, not an independent review, and not the Product Owner's
acceptance, which the Product Owner gives on #280.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It already served
  `fb11b3e`, the merge of #285's retro (PR #304), so this round promoted nothing. No window held it.
  `dev-runtime-verify.sh` reported VERIFY: PASS at `fb11b3e5776f64ab9116844ea51dda44364ad28a`
  before the round (2026-11-14 15:04Z), after the captures (04:13Z) and after the walkthrough
  (04:49Z).
- **Code under test:** `fb11b3e`. #287's branch adds documents over it, so its head has
  `fb11b3e`'s application code. Node 26.13.0.
- **Content:** the demo dataset, 56 entries, all published, and each suite's and each capture's
  own synthetic fixtures, which it removes.

## Checks

The browser suites ran at `fb11b3e` between 15:04Z and 15:31Z on 2026-11-14, T021, the captures
and the measures between 04:01Z and 04:11Z on 2026-11-15, the local checks on #287's working tree
at about 04:14Z, before the record was written, and the measures the review asked for between
05:05Z and 05:08Z. The pull request states the checks at its head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 784 of 784 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 604 passed, 14 skipped, in 26.6 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `fb11b3e`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (04:14Z) |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 04:01Z on 2026-11-15. No test of the full run failed. The run's near-timeout report
named three tests at 60 % or more of their 30 s: two Homepage tests whose "Return the runtime's
content to draft" step took up to 18.5 s, and the Health Reports pager; each passed.

## Contrast

`scripts/measure-text-contrast.ts` at `fb11b3e`, at 1,440, 1,024, 768, 375 and 320 px, every run
exit 0. Small text needs 4.5:1 and large text 3:1 (WCAG 2.2 SC 1.4.3); the lowest reading of each
text is given with the width it was read at. Every reading is 4.5:1 or more.

**On the field under a list's heading**, the demo dataset:

| Text | `/news` | Health News | Health Content |
| --- | ---: | ---: | ---: |
| The breadcrumb's link | 10.70 (320) | 10.70 (375, 320) | 10.55 (320) |
| The breadcrumb's current page | 10.00 (320) | 8.84 (320) | 7.00 (320) |
| The label | 8.97 (320) | 8.84 (320) | 8.72 (320) |
| The H1 | 6.99 (320) | 7.91 (320) | 7.39 (320) |
| The lead | 6.63 (375) | 6.45 (768, 375, 320) | 6.45 (375, 320) |
| The pill link's words | 6.45 (every width) | — | — |

**On the large card**, the demo dataset's newest item of each list, and over a white picture
(`--fixtures scripts/screenshot-fixtures/news-list-light-picture.ts /news`), the least the
gradient can have behind the text:

| Text | `/news` | Health News | Health Content | White picture |
| --- | ---: | ---: | ---: | ---: |
| The date pill's words | 7.75 | 7.75 | 7.75 | 7.75 |
| The label's words | 7.32 (1,024) | 7.17 (1,024, 768) | 9.33 (768) | 6.35 (1,440, 1,024, 768) |
| The title | 7.06 (1,440) | 7.06 (1,440) | 8.58 (1,440, 1,024) | 6.74 (1,440, 1,024, 768) |
| The summary (from 640 px) | 8.84 (1,440 to 768) | 8.84 | 9.74 | 8.98 |

The white-picture readings equal #284's at `f4ba6fb`.

**On the field under a Post page's header**, seven demo posts and one synthetic post:

| Post | Breadcrumb's current page | H1 | Summary | Category | Review date |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/news/demo-news-flu-vaccine` (picture) | 5.41 (375) | 6.45 (768) | 6.45 (768 and below) | 6.71 (320) | — |
| `/news/demo-news-ncd-screening` (picture) | 5.41 (375) | 6.45 (768) | 6.45 | 6.80 (320) | — |
| `/news/demo-news-health-fair` (picture, no body) | 5.48 (375) | 6.45 (768) | 6.45 | 8.37 (320) | — |
| `/news/demo-news-district-board` (no picture) | 5.34 (375) | 6.27 (375) | 6.45 | 8.03 (375, 320) | — |
| `/activities/demo-activity-health-fair` | 5.48 (375) | 6.45 (768) | 6.45 | — | — |
| `/health/content/demo-health-dengue` | 5.70 (320) | 6.27 (375) | 6.45 | — | — |
| `/health/content/demo-health-flu-vaccine` | 5.55 (320) | 6.45 (768) | 6.45 | — | 6.63 (320) |
| A synthetic Health Content post without a picture | 6.44 (320) | 6.19 (375) | 6.45 | — | 6.45 (320) |

The date pill's `brand-dark` words read 7.75:1 on every post. Every breadcrumb link, each of a
trail's two or three, was read on the seven demo posts and on Health News and Health Content
(`main nav a >> nth=0`, `1` and `2`): the lowest is 7.28:1, the third link of the two Health
Content posts at 320 px; on the lists 9.34:1, Health Content's second link at 320 px. `/news` has
one link, in the first table.

**A large card without a picture**, on its `deep-visual` (a scratch fixture: the white-picture
fixture's News without its picture, the newest on `/news`): the date pill's words 7.75, the
label's words 11.15 (768), the title 11.12 (768) and the summary 11.59 (768).

On the posts, the selectors are #285's (the note from #285 on #287); the synthetic post is
`scripts/screenshot-fixtures/post-empty-row.ts`'s Health Content item, published under a fixed
slug for the run and removed after it.

**Focus rings**, `scripts/measure-focus-contrast.ts` at `fb11b3e`, the lowest contrast of what
lies beside the ring with focus (WCAG 2.2 SC 1.4.11, 3:1), equal to #283's at `5fb6b4a` (PR #296)
and #284's at `f4ba6fb` (PR #299):

- a small card over the field's edge (`--fixtures scripts/screenshot-fixtures/news-list.ts
  "/news?page=2"`, the first card): 5.40 (1,440), 2.77 (1,024, blended pixels at a fractional
  edge, 0 % of the ring's neighbours under 3:1), 5.09 (768), 5.47 (375, 320); the fourth card, on
  the page's colour: 6.07, 3.73, 3.05, 6.07, 6.07;
- the large card on `/news`: 5.51 (1,440), 4.06 (1,024), 5.47 (768, 375, 320), 0 % under 3:1 at
  every width. Under the ring alone the field's edge reads down to 1.00:1, which the band is for.

## Screenshots

After, at `fb11b3e`, with reduced motion preferred, so the pages show at rest:

```text
node scripts/capture-screenshots.mjs <dir> after-<name>-<width>=<path>@<width>   # the demo dataset
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/<module>.ts <dir>                                     # each module below
```

Before: this round captured none; the runtime cannot serve the base again without `--replace`
(`docs/operations/development-quadlet.md` "Promote a new commit"). They are the earlier tickets',
each from the image branch its ticket pushed:

- the six addresses on the demo dataset, and `/news` with synthetic News, from
  `evidence/009-281-screenshots` at `360edff`, taken at `668d3e5` on `main` before the feature's
  first promotion (the note from #281);
- `scripts/screenshot-fixtures/posts.ts` and `activity-photos.ts` from `evidence/009-286-screenshots`
  at `ab9128a`, taken at `50402c1`, the same as `668d3e5` on the Post pages (#285 comment
  6877659654, item 3);
- `scripts/screenshot-fixtures/post-empty-row.ts` from `evidence/009-285-screenshots` at `d0a7971`,
  taken at `fc5dbc0`, #285's base.

Between the before and the after the demo dataset was reworded (#289, 2026-11-13), so the titles
differ as well as the design.

`scripts/evidence-branch.sh` put the 215 images and their `captures.txt` on the image-only branch
`evidence/009-287-screenshots`, at `eddaa49715948b31ea7715b07c638d1e7dc0cdd6`.

Page heights in pixels: the after as the capture scripts printed them, the before read from the
PNGs.

| Page | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/news`, before (`668d3e5`) | 1,501 | 1,494 | 2,030 | 3,447 | 3,449 |
| `/news`, after (`after-news`) | 1,801 | 1,765 | 2,242 | 1,791 | 1,917 |
| Health News, before | 1,607 | 1,600 | 2,110 | 3,131 | 3,217 |
| Health News, after (`after-health-news`) | 1,945 | 1,909 | 1,969 | 1,777 | 1,973 |
| Health News, `?topic=demo-topic-vaccine`, before | 1,129 | 1,138 | 1,165 | 1,283 | 1,425 |
| Health News, `?topic=demo-topic-vaccine`, after (`after-health-news-topic`) | 1,129 | 1,117 | 1,147 | 1,001 | 1,177 |
| Health News, `?topic=demo-topic-elderly`, no result, before | 900 | 900 | 919 | 1,011 | 1,167 |
| Health News, no result, after (`after-health-news-none`) | 931 | 931 | 969 | 1,047 | 1,203 |
| Health Content, before | 1,551 | 1,540 | 2,024 | 2,929 | 3,011 |
| Health Content, after (`after-health-content`) | 1,885 | 1,819 | 1,939 | 1,673 | 1,943 |
| News post `/news/demo-news-flu-vaccine`, before | 1,168 | 1,226 | 1,634 | 1,566 | 1,658 |
| News post, after (`after-news-post`) | 1,196 | 1,278 | 1,612 | 1,544 | 1,636 |
| News post without a picture `/news/demo-news-district-board`, after (`after-news-post-no-picture`) | 900 | 900 | 900 | 969 | 1,159 |
| Activity `/activities/demo-activity-health-fair`, before | 1,893 | 1,781 | 2,901 | 2,293 | 2,320 |
| Activity, after (`after-activity-post`) | 1,974 | 1,923 | 2,983 | 2,345 | 2,372 |
| Health Content post `/health/content/demo-health-dengue`, before | 956 | 1,016 | 1,464 | 1,348 | 1,526 |
| Health Content post, after (`after-health-content-post`) | 1,018 | 1,102 | 1,476 | 1,360 | 1,538 |

The News post without a picture has no before: #281's set has none, and the demo dataset's
`demo-news-district-board` was not captured then. The after heights of the three lists equal
#284's at `cbe8eab` where that note gives them (`/news` 1,801 and 1,791; Health News 1,945 and
1,777; Health Content 1,885 and 1,673).

The cases the demo dataset lacks, each `scripts/capture-with-fixtures.ts` with the module named,
which the run takes back:

| Case | Module, file prefix | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Twelve News with a second page, before (`668d3e5`, 24 News) | `news-list`, `news-list-24` | 2,739 | 2,732 | 3,652 | 6,134 | 6,147 |
| Twelve News with a second page, after | `news-list`, `news-list-24` | 2,703 | 2,583 | 3,462 | 2,709 | 2,835 |
| The second page, before | `news-list`, `news-list-24-page-2` | 2,739 | 2,732 | 3,652 | 6,134 | 6,147 |
| The second page, after | `news-list`, `news-list-24-page-2` | 2,345 | 2,237 | 3,078 | 2,549 | 2,675 |
| A full page of twelve, no second page, after | `news-list`, `news-list-12` | 2,627 | 2,507 | 3,386 | 2,595 | 2,721 |
| Three News, after | `news-list`, `news-list-3` | 1,373 | 1,289 | 1,437 | 1,309 | 1,435 |
| Two News, before | `news-list`, `news-list-2` | 1,139 | 1,122 | 1,179 | 1,690 | 1,777 |
| Two News, after | `news-list`, `news-list-2` | 1,015 | 981 | 1,437 | 1,155 | 1,281 |
| One News, before | `news-list`, `news-list-1` | 1,049 | 1,032 | 1,089 | 1,117 | 1,209 |
| One News, after | `news-list`, `news-list-1` | 1,041 | 1,041 | 1,019 | 1,021 | 1,147 |
| A News post with a portrait One Page, before (`50402c1`) | `posts`, `synthetic-news-post` | 1,276 | 1,424 | 2,282 | 1,951 | 2,089 |
| The same, after | `posts`, `synthetic-news-post` | 1,304 | 1,496 | 2,243 | 1,913 | 2,051 |
| An Activity with six photos, before | `posts`, `synthetic-activity-post` | 1,832 | 1,740 | 2,619 | 2,012 | 2,087 |
| The same, after | `posts`, `synthetic-activity-post` | 1,914 | 1,822 | 2,700 | 2,064 | 2,139 |
| A Health Content post with a One Page, before | `posts`, `synthetic-health-content-post` | 1,110 | 1,110 | 2,124 | 1,741 | 1,905 |
| The same, after | `posts`, `synthetic-health-content-post` | 1,110 | 1,194 | 2,119 | 1,737 | 1,901 |
| A post with a landscape picture alone, before (`fc5dbc0`) | `post-empty-row`, `news-landscape` | 900 | 900 | 1,169 | 1,149 | 1,247 |
| The same, after | `post-empty-row`, `news-landscape` | 900 | 929 | 1,183 | 1,163 | 1,261 |
| A post with a One Page alone, before | `post-empty-row`, `news-one-page` | 1,110 | 1,110 | 1,737 | 1,248 | 1,360 |
| The same, after | `post-empty-row`, `news-one-page` | 1,100 | 1,100 | 1,732 | 1,244 | 1,356 |
| A Health Content post without a picture, before | `post-empty-row`, `health-content-plain` | 900 | 900 | 900 | 900 | 900 |
| The same, after | `post-empty-row`, `health-content-plain` | 900 | 900 | 900 | 900 | 913 |
| An Activity with twenty photos, folded, before (`50402c1`) | `activity-photos`, `activity-photos` | 1,932 | 1,820 | 2,941 | 2,207 | 2,260 |
| The same, after | `activity-photos`, `activity-photos` | 2,014 | 1,902 | 3,022 | 2,259 | 2,312 |
| The same, open, before | `activity-photos`, `activity-photos-open` | 2,936 | 2,676 | 4,053 | 2,851 | 2,831 |
| The same, open, after | `activity-photos`, `activity-photos-open` | 3,018 | 2,758 | 4,134 | 2,903 | 2,882 |

`news-list-12` and `news-list-3` have no before: #281's set holds 24, two and one News. In
#281's files the two pages of 24 are equally high. The prototype's page of twelve with the pager
(spec #280 "Measured in the prototype") was 2,643, 2,523, 3,362, 2,599 and 2,855 px; the built
first page of twelve with its pager (`news-list-24`) is 2,703, 2,583, 3,462, 2,709 and 2,835 px,
with different titles and pictures.

## Spec #280's decisions and the decisions made while the tickets were built

Spec #280 listed no pending confirmation. Every decision made while the tickets were built has a
recorded answer on its ticket. `docs/design/DESIGN.md` §10 and §13 cite each one that decides
what a page shows; #282's decides a test, and #287's is this record's:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #281 | Where the link to Health News sits from 640 px | At the heading's upper right, as the prototype (comment 6846855734) |
| #281 | A card's ring over the field; the field's `surface-soft` glow; `posts.ts` and the leak check | Decided with the cards; no glow; #285 rewrites the fixture (comment 6847783611) |
| #282 | The `/news` motion case shows a pager and an empty state | Yes, test only (comment 6851937209) |
| #283 | A list card's focus ring | The `brand-primary` ring with a white band (comment 6854670042) |
| #283 | `05` §5.1's crop for staff | Amended in #283, v2.9 (comment 6855158989) |
| #283 | A small card's label below 640 px | On its own line under the date (comment 6855983271) |
| #284 | The large card's label pill over a white picture; a picture's focal point | A `brand-dark` 40 % fill; `ContentCard` without a placeholder, the other components to #298 (comment 6870867641) |
| #284 | The large card's label when the line cannot hold it | Under the date, never cut (comment 6871942671) |
| #286 | A post's chips; the photos' heading space | The Homepage's chip whole at 44 px; 24 / 28 px above the photos (comment 6876267675) |
| #285 | The details card below 1,024 px; the text under the frame; the posts' before screenshots | After the frame; 32 px under it; #286's at `50402c1` (comment 6877659654) |
| #285 | The frame when the breadcrumb wraps; the breadcrumb's motion | 4.25 rem kept; shown at once (comment 6878495201) |
| #287 | The walkthrough's result and its eight coverage gaps | Nothing to fix; the gaps accepted, five in the walkthrough's question and three after the review (comment 6890845699) |

Still open:

- **#298**, a picture's focal point in the components that keep EmDash's placeholder
  (`ActivityCard`, `ActivityPhotos`, `HomeActivityTile`, `HomeHealthCard`, `HomeLeadershipStrip`,
  `PersonCard`, `PostColumns`). Of the pages in scope it affects an Activity's photos
  (`ActivityPhotos` on `/activities/{slug}`), which crop on their middle whatever focal point staff
  set; `ContentCard` crops around a focal point and `PostColumns` shows the picture whole. The
  other components are on pages outside the feature.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window (#277 comment 6842148724): Feature 009's pages join that visit.

## Walkthrough

After the 404 log was cleared, the Product Owner was given these steps in the session, with the
list under "What the evidence does not cover" and the coverage gaps as one question:

1. `/news` on a desktop with motion allowed: the heading's entrance, the cards' reveal and hover,
   the link to Health News;
2. `/news/health` with a Health Topic chosen, and `/health/content`;
3. a News post with a picture (`/news/demo-news-flu-vaccine`) and one without
   (`/news/demo-news-district-board`): the frame that stays in view;
4. the Activity `/activities/demo-activity-health-fair` with "ดูรูปทั้งหมด";
5. the Health Content post `/health/content/demo-health-flu-vaccine` with its review date;
6. steps 1 to 5 at 375 px in the browser's device mode;
7. the before and after screenshots of the synthetic cases.

The Product Owner chose all four groups (steps 1 and 2, 3 to 5, 6, 7) as opened, answered
"ผ่าน ไม่มีอะไรต้องแก้ (แนะนำถ้าไม่เจอปัญหา)", and accepted the first five coverage gaps below,
"A รับตามนี้ (แนะนำ)" (#287 comment 6890845699). The app's log then held no request for `/health/content`, so the Product Owner was asked
to open the list and the Health Content post and did, answering "ผ่าน ไม่มีอะไรต้องแก้".

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts`, from 04:14:58Z,
read at 04:47Z and 04:49Z): 31 page requests, every one 200: `/news` (three times), `/news/health`
(three), all six demo News posts, `/activities/demo-activity-health-fair` (twice), `/activities`,
`/health/content` (twice) and four Health Content posts (`demo-health-dengue` three times,
`-diabetes`, `-falls` and `-quit-smoking` once each). The log holds no request for `/health/content/demo-health-flu-vaccine`,
the one post with a review date, and no query string, so it shows neither a Health Topic chosen
nor a window width; those rest on the Product Owner's answer. After the answers residue reported
RESIDUE: NONE with 0 unmarked misses and the 56 demo entries published, and verify VERIFY: PASS at
`fb11b3e`.

## What the evidence does not cover

The five the Product Owner accepted in the walkthrough's question:

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran
  in Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps were
  the browser's device mode. #277 visits the pages inside #238's UAT window.
- The migrated Legacy News: the development runtime holds the demo dataset only. The Legacy site's
  39 daily PM 2.5 reports, each a One Page with no summary and no category (spec #280 "What the
  content looks like"), are seen here only through the synthetic cases: `news-list.ts`'s cards
  without a category or summary, and `post-empty-row.ts`'s posts with a picture alone.
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the
  suites and the walkthrough read it there. `npm run build:check` read the built stylesheets and
  passed (`check-built-styles: PASS`); the look at a built page with motion allowed is due with the
  first production image of this feature (`scripts/production-image-check.sh`, #276).
- A picture's focal point in the components that keep EmDash's placeholder (#298).
- The before screenshots as a control of this round: they are #281's at `668d3e5`, #286's at
  `50402c1` and #285's at `fc5dbc0`. Between `668d3e5` and the after, `7ad1208` (#289) changed three
  lines of the demo dataset's texts.

Three more, noted while the record was written and accepted in a second question after the
review, "A รับตามนี้ (แนะนำ)" (the same comment, item 5):

- A Health Content post with a review date in the walkthrough: the log shows the Product Owner
  opened four Health Content posts, none of them the one with "ทบทวนล่าสุด". This round's screenshots
  show a review date on the synthetic post without a picture (`after-health-content-plain`), and
  its contrast is in the table above.
- A large card over a real One Page poster: the demo's newest News has a poster whose own words
  show faintly under the gradient behind the title and summary (the note from #284); the contrast
  over a white picture is the measured floor.
- Reduced motion in the walkthrough: its steps asked for a browser with motion allowed, and the
  log shows no motion setting. The suites prefer reduced motion on every page but the tests of
  motion (`DESIGN.md` §8.12).

## The prototype

The prototype is on the branch `prototype/news-post-redesign` at `427f5c8`, a child of `668d3e5`
outside `main`: its builder scripts under `docs/prototypes/news-post-redesign/` and its record,
`docs/prototypes/news-post-redesign.md`. Its data, pages, pictures and screenshots hold Legacy
site content and stay on the development host. #280 comment 6889036497 points to it, checks the
record's "Where the built pages will differ" against the pages at `fb11b3e` and names eight
further differences, each decided on its ticket.

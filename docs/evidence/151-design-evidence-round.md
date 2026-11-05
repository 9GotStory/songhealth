# #151 evidence: Feature 006 (the frontend design) on the development runtime

Feature 006's evidence round (spec #144, ADR 0007), run on 2026-11-05 by Claude Code at `b5f407d`,
the head of `006-frontend-design`, and the Product Owner's walkthrough of the same day. This is a
self-run record, not an independent review, and not the Product Owner's acceptance, which the
Product Owner gives on #144.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`.
  - `dev-runtime-update.sh --sha e5fd8a668684f645d40f9cc7bedc2b7f1d616958` promoted it to `main`
    at 12:57Z for the screenshots before, after a backup of the database and media
    (`20261105T125702Z`, taken at `571b222`). VERIFY: PASS at `e5fd8a6`.
  - `dev-runtime-update.sh --sha b5f407d6177b201b38bff1ee8c152617c196dbe2 --no-backup` promoted it
    to the head at 12:58Z. Feature 006 changes no model, and `main` and `b5f407d` have the same
    `package-lock.json` and `seed.json`.
  - The model-update step, `dev-runtime-model-update.sh`, reported "the database has the seed's
    content model; nothing to change".
  - `dev-runtime-verify.sh` reported VERIFY: PASS at `b5f407d6177b201b38bff1ee8c152617c196dbe2`
    after the promotion (12:58Z), after the model-update step and after the walkthrough (13:19Z
    and 13:26Z).
- **Code under test:** `b5f407d` has the application code of `571b222`, which the runtime served
  after #149. The commits after it change documents, comments in `src/styles/global.css` and
  `scripts/demo-dataset/content.ts`, a longer cleanup timeout for the browser suites and a node
  test. This branch adds only documents, so its head has `b5f407d`'s code. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset as #149 left it, with its dates counted from 2026-11-05, and each
  suite's own synthetic fixtures, which the suite removes. The walkthrough's News and Activity are
  the newest of their kind, `demo-news-health-fair` and `demo-activity-health-fair`. Both have the
  demo One Page as their picture, and the Activity has twelve photos.

## Checks at `b5f407d`

Run between 12:58Z and 13:13Z.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 369 of 369 passed |
| Build | `npm run build:check` | complete |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | pass; jscpd's baseline unchanged at 21 clones |
| Browser seam, serial | `scripts/dev-runtime-env.sh npm run test:browser -- --workers=1` | 359 passed, 14 skipped, in 12.3 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | 46 entries cleared before the walkthrough |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator.
The coordinator ran those 14 next, after checking that the runtime's source equals the checkout's
`HEAD`. The browser suite's counts equal #148's at `54596a1`; #149 added no browser test.

The seams are evidence here, not gates (spec #144 "Testing Decisions"):

- Seam A, the public pages over HTTP, runs in the browser suite. Feature 006 added
  `public-thai-titles`, `public-posts` and `public-activity-photos`, and extended
  `public-homepage` and `public-homepage-curation`. `public-demo-dataset`'s axe, focus and reflow
  sweep of each collection's first entry covers the health fair News and Activity, which lead
  their collections (#149).
- Seam B, the Thai keep-together module `src/lib/thai-title.ts`, runs in `test:node`
  (`thai-title.test.ts`, `public-titles.test.ts`).
- The runtime checks run in verify and residue, above.

## Screenshots

The same demo dataset was captured at `main` (`e5fd8a6`, before) and at `b5f407d` (after), at 1440,
375 and 320 px, with the menu open at both mobile widths on the Homepage:

```text
scripts/dev-runtime-env.sh node scripts/capture-screenshots.mjs <dir> \
  <before|after>-home=/ <…>-news=/news/demo-news-health-fair \
  <…>-activity=/activities/demo-activity-health-fair \
  <…>-health=/health/content/demo-health-diabetes <…>-activities=/activities
```

After, the Activity was captured again with its photos open
(`after-activity-open=/activities/demo-activity-health-fair!ดูรูปทั้งหมด (12 รูป)`). The Featured
hero with a portrait picture came from this command at each commit, which captures `/` and the hero
at 1024 px, then removes its synthetic News:

```text
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/homepage-featured-portrait.ts <dir>
```

`scripts/evidence-branch.sh` put the 49 captures on the image-only branch
`evidence/006-151-screenshots`, at
[`e95e731`](https://github.com/9GotStory/songhealth/tree/e95e731d0b39bba3d95f903886c8e65a26b65f8e).

Page heights in pixels, before → after, as `capture-screenshots.mjs` printed them:

| Page | 1440 px | 375 px | 320 px |
| --- | --- | --- | --- |
| Homepage | 5,864 → 5,736 | 9,356 → 5,821 | 9,851 → 6,196 |
| Homepage, portrait Featured | 5,864 → 5,736 | 9,356 → 6,045 | 9,851 → 6,385 |
| News, Post page | 2,009 → 1,144 | 1,444 → 1,658 | 1,502 → 1,716 |
| Activity, twelve photos | 3,280 → 1,926 | 4,938 → 2,352 | 4,583 → 2,355 |
| Activity, photos open | (no control) → 2,254 | (no control) → 2,513 | (no control) → 2,498 |
| Health Content, Post page | 1,459 → 989 | 1,293 → 1,417 | 1,387 → 1,541 |
| Activities list | 1,526 → 1,526 | 2,967 → 2,967 | 3,098 → 3,166 |

The Homepage's heights after equal those `DESIGN.md` §8.2 records at `571b222`, so §8.2 stands. The
hero at 1024 px went from 992 to 764 px.

The captures show the known limits that `DESIGN.md` §10 records:

- on the Post pages of the health fair News and Activity, the left column is shorter than the One
  Page, so the picture does not follow while scrolling;
- at 1440 px the News summary breaks inside a word, "เบา / หวาน": the keep-together rule covers
  titles, not summaries.

## Walkthrough

The Product Owner walked through the pages on the development runtime after the 404 log was
cleared, with the steps given in the session (#151 comment 6659030000):

1. the Homepage on a desktop, `/`;
2. the Homepage on a phone, at 375 px;
3. the News `/news/demo-news-health-fair`;
4. the Activity `/activities/demo-activity-health-fair`, with its control opened and closed by click
   and by keyboard, and its photos in rows of three on a phone and four on a desktop;
5. the Health Content item `/health/content/demo-health-diabetes`.

The Product Owner chose "ผ่านครบทุกข้อ": all five showed as described, and nothing needs a fix.
So no design change follows, and `DESIGN.md` stays as #150 left it.

**Walkthrough coverage.** The runtime answers only on `127.0.0.1`, so the steps asked for the
phone view at 375 px in the browser's device mode: no real phone and no real touch were walked
(spec #144 asks for "the Homepage on a phone", #148's note for the control "by touch"). The control
is a native `<details>` and `<summary>` (`src/components/ActivityPhotos.astro`), so a tap acts as a
click. `public-activity-photos.spec.ts` covers it with and without JavaScript, and
`after-activity-open-375` and `-320` show the rows of three with "ซ่อนรูป 4 รูป" under the last
photo. The Product Owner accepted the walkthrough as walked, with this gap named in the acceptance
("A รับตามที่ walk (แนะนำ)", #151 comment 6659258529, item 1): a real phone sees the pages again on
Feature 005's trial import and before go-live.

The walkthrough changed no content. The Admin change log (marker `songhealth-admin-change`, read as
`production-foundation.md` §7.5 says) has one line after the round's last fixture cleanup at
13:12:38Z: `13:23:16Z ADMIN POST /_emdash/api/visual-editing/action-token 200`. EmDash's toolbar
writes it while a signed-in user keeps a public page open, renewing a token, and it changes nothing
(`docs/agents/emdash-1.1.0.md` "Edit mode and the toolbar"). The Product Owner chose to keep such
renewals out of the log in a separate issue, #164 (#151 comment 6659258529, item 2). At 13:19Z
and 13:26Z, `dev-runtime-residue.sh` listed no miss in the 404 log and reported RESIDUE: NONE, and
`dev-runtime-verify.sh` reported VERIFY: PASS at `b5f407d`.

## Version-specific facts

**emdash 1.1.0**, in `docs/agents/emdash-1.1.0.md` "Edit mode and the toolbar": for a signed-in
user whose role is Author or above, the toolbar on a public page renews its visual-action token
every 240 s with `POST /_emdash/api/visual-editing/action-token`, which changes nothing
(`src/visual-editing/toolbar.ts` `refreshVisualActionToken`,
`src/astro/routes/api/visual-editing/action-token.ts`). The rest of the round relies on the facts
in spec #144 "Version-specific evidence" and in that file.

# #128 evidence: Feature 004 (ITA) on the development runtime

Feature 004's evidence round (spec #121, ADR 0006), run on 2026-11-03 by Claude Code at `f29b40e`,
the head of `004-ita`, and the Product Owner's Admin walkthrough of the same day. This is a
self-run record, not an independent review, and not the Product Owner's acceptance, which the
Product Owner gives on #121.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`.
  - `dev-runtime-update.sh --sha f29b40e9ea2d6e05065870d68a896cf89da2a126` promoted it at
    07:08Z, after a backup of the database and media (`20261103T070808Z`, taken at `0692f4d`).
  - The model-update step, `dev-runtime-model-update.sh`, reported "the database has the seed's
    content model; nothing to change".
  - `dev-runtime-verify.sh` reported VERIFY: PASS at `f29b40e9ea2d6e05065870d68a896cf89da2a126`
    after the promotion (07:08Z), the model-update step (07:09Z), the suites and the screenshots
    (07:22Z), and the walkthrough's cleanup (13:15Z).
- **Code under test:** `f29b40e` has the code of `501a278`, where #126's evidence round ran: the
  commits after it change only `CLAUDE.md` and `docs/agents/issue-tracker.md`. This branch adds
  only documents to `f29b40e` (this record, `05` §7.1 and `docs/agents/emdash-1.1.0.md`), so its
  head has `f29b40e`'s code. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset, with MOIT 1 and MOIT 2 of fiscal year 2570 (#126), and each
  suite's own synthetic fixtures, which the suite removes.

## Checks at `f29b40e`

Run between 07:09Z and 07:22Z.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 345 of 345 passed |
| Build | `npm run build:check` | complete |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | pass; jscpd's baseline unchanged at 21 clones |
| Browser seam, serial | `scripts/dev-runtime-env.sh npm run test:browser -- --workers=1` | 328 passed, 14 skipped, in 10.9 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | 46 entries cleared before the walkthrough |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator.
The coordinator ran those 14 next, after checking that the runtime's source equals the checkout's
`HEAD`. The browser suite's counts equal #126's at `501a278`.

## Screenshots

`scripts/dev-runtime-env.sh node scripts/capture-screenshots.mjs <dir> ita=/ita ita-2570=/ita/2570
moit-1=/ita/demo-moit-1-2570 moit-2=/ita/demo-moit-2-2570` captured each page at 1440, 375 and
320 px, and `/ita` again with the menu open at both mobile widths. `scripts/evidence-branch.sh`
put them on the image-only branch `evidence/004-128-screenshots`, at
[`4b88b93`](https://github.com/9GotStory/songhealth/tree/4b88b93cc21744a215ec6487d9b600eede87b364):

- `ita-*`, `ita-2570-*`, `moit-1-*` and `moit-2-*`: the round's 14 captures. MOIT 1's Evidence 2.3
  shows "ไฟล์ไม่พร้อมให้บริการ", and MOIT 2 shows both Rounds, the notes, the links marked
  "ข้อมูลปัจจุบัน" and the external links.
- `walkthrough-ita-*`, `walkthrough-2571-*` and `walkthrough-moit-*`: 11 captures of the
  walkthrough's MOIT, taken before its deletion.

## Admin walkthrough

The Product Owner walked through the Admin between 09:59Z and 13:10Z, with steps given in the
session from `05` §7.1 and §7.2, and answered "ครบทุกขั้น ไม่มีปัญหา". Claude Code then read the
result back through the native API and the Admin change log (ADR 0005), read as
`production-foundation.md` §7.5 says:
`journalctl --user -u songhealth-dev-app.service -o cat`, marker `songhealth-admin-change`. Each
line of the window names the development Administrator.

| Step | What the change log and the API show |
| --- | --- |
| Media usage setup, `/settings/media-usage` | Tracking had been active since 2026-10-28 with 0 of 11 collections indexed. 34 `POST /_emdash/api/admin/media-usage/progress` 200 within two seconds (09:59:37Z–09:59:39Z) indexed all 11, and each demo PDF's usage coverage became "complete". |
| Duplicate of demo MOIT 1, from the MOIT list | `POST /_emdash/api/content/moit/{demo MOIT 1}/duplicate` 201 (10:00:49Z) |
| The checklist and the block picker | Fiscal year 2571, number 1, the title without "(Copy)". The copy held three blocks: Requirement 1, with the key it has in demo MOIT 1, and two "หลักฐาน: ไฟล์" blocks with new keys. Last year's seven file blocks and Requirement 2 were gone. The new blocks hold files from the library: "1.1 ฟอร์มเผยแพร่" (`demo-ita-form.pdf`, รอบ 6 เดือน) and "2.1 รายงานผลการกำกับติดตาม" (`demo-ita-report.pdf`, รอบ 12 เดือน). No media was created in the window. |
| Preview and Publish | 6 `POST …/preview-url` 200 (13:04Z–13:10Z), then one `POST …/publish` 200 (13:10:37Z); two revisions |
| The public pages | `/ita` listed 2571 (one MOIT) before 2570 (two); `/ita/2571` and the MOIT page answered 200, with both Round tags |
| "Used in" of `demo-ita-form.pdf` | demo MOIT 1, demo MOIT 2 and the new MOIT, coverage "complete" (`GET /_emdash/api/media/{id}/usage`) |

The 404 log held no entry after the walkthrough.

The published copy missed three steps of the checklist:

- **Slug (step 3).** It stayed the one Duplicate made from the title, beginning
  `ตัวอย่าง-หน่วยงาน…`, not `moit-1-2571`. The page answered at that address, as spec #121 allows.
- **"ปรับปรุงล่าสุด" (step 7).** It kept demo MOIT 1's date, so the fiscal year 2571 page showed
  "ปรับปรุงล่าสุด 28 ต.ค. 2569".
- **Requirement 2 (step 5).** It went with last year's Evidence, so "2.1" grouped under
  Requirement 1, whose title still named 2570.

The Product Owner said the slug and the date were skipped, not lost ("ไม่ได้แก้ (มองข้ามไป)"), and
chose checks in `05` §7.1 against these misses ("เพิ่มจุดตรวจใน 05 §7.1 (Recommended)"): #128
comment 6605066482. The checklist now says:

- step 1: Duplicate copies "ปรับปรุงล่าสุด" and makes a long Thai slug from the title;
- step 3: the Slug field is in the editor's "URL & language" section;
- step 8: what Preview must show before Publish: the address, the new fiscal year, this Round's
  date, Requirement titles without last year's year, and each piece of Evidence under its
  Requirement.

**Walkthrough coverage.** Both Rounds' files went in before one Publish, so adding the next
Round's Evidence to a published MOIT and publishing it again was not walked on its own.

## Cleanup

- The walkthrough's MOIT was deleted on the Product Owner's word ("ลบทิ้ง (Recommended)"), through
  the native API at 13:14:04Z. `DELETE /_emdash/api/content/moit/{id}` and `…/permanent` both
  answered 200, and both are in the Admin change log.
- Afterwards:
  - the MOIT list and its trash held only the two demo MOITs;
  - `/ita` showed 2570 alone, and `/ita/2571` answered 404;
  - "Used in" of `demo-ita-form.pdf` and `demo-ita-report.pdf` listed the demo MOITs, with
    coverage "complete".
- `dev-runtime-residue.sh` reported RESIDUE: NONE, and `dev-runtime-verify.sh` reported VERIFY:
  PASS at `f29b40e`.
- The 404 log keeps one row per path, with the latest hit's referrer. The `/ita/2571` check
  carried the tests' synthetic referrer, but a later hit on that path from a browser on `/ita`
  replaced it. So `--clear-404-log` listed that miss as not synthetic and cleared nothing (exit 3),
  and the clear is the Product Owner's, with `--clear-404-log-including-others`.
- The demo dataset stays installed until the Product Owner asks for `remove`. Media usage tracking
  stays set up.

## Version-specific facts

**emdash 1.1.0:** `docs/agents/emdash-1.1.0.md`, "Media" (what advances media usage indexing and
what makes it stale), "Admin input" (Duplicate, the Slug input, Preview) and "Native API for
tests" (the 404 log).

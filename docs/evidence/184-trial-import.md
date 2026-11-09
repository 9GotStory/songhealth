# #184 evidence: the trial import of the whole Legacy site (Feature 005)

Feature 005's evidence round (spec #174 "Trial evidence", ADR 0002 and ADR 0008), run on 2026-11-09
by Claude Code at `7ad32a8`, the head of `005-wordpress-migration`, with the Product Owner's
walkthrough of the same day. This is a self-run record, not an independent review, and not the
Product Owner's acceptance, which the Product Owner gives on #174. It holds counts, checks and
digests, and no screenshot of real content.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`, on `astro dev`.
  - It served Feature 007's `565ddaf` before the round. The Product Owner gave it to this trial
    (#184 comment 6731300995). It stays at Feature 005's head after the round, and Feature 007
    promotes back with `--replace` when it needs the runtime.
  - `dev-runtime-update.sh --sha 7ad32a84986635c20ea2bfe26686d188fc53fe16` promoted it at
    03:10:43Z to 03:11:47Z, after a backup of the database and media taken at `565ddaf`
    (`20261109T031043Z`). `565ddaf`'s copy of that script has no `--replace` option or guard, so
    the option #184's decision named was not passed. VERIFY: PASS at `7ad32a8`, the content-model
    check included, so no model-update step was needed.
- **The window:** `dev-runtime-window.sh open` at 03:14:44Z, closed after the restore and before the
  full suite began at 03:49:54Z. Its backup, taken at `7ad32a8`, is `20261109T031451Z`.
- **Code under test:** `7ad32a8`, on Node 26.13.0 and npm 12.2.1. This branch adds only this record.

## Inputs

| File | SHA-256 |
| --- | --- |
| `WordPress.2026-11-06.xml` | `ded5153de20c65bf3e451883791a1ba35a5253fc2381b54a42e4419f9ea93556` |
| `wp-content.zip` | `baf43c3b40ccc0a67c26996c4ceefed811020012f4465380c5c73c9e2aee0057` |
| `classification-list.csv` | `c2ac3a36388e687ecf5da6136dfc131312fcf5783ee17305dc3b72bc07d57d7c` |
| `anom-001.pdf` | `9c636776c823ab7d123392fa5c8ebb4c4e10b7ee4766e7470ac2fd7e4badddff` |
| `import-plan.json` | `419d4671c59f5dc6a13a091f443a5426fe9d095173f4108c66245a13b7ab0c5d` |
| `import-report.json` | `665d0c2783272366dbdd6448cab26dbe80fb123e8135146e500bfd950f9a113f` |
| `verify-report.json` | `1c25ce7fcbb644c8beac7e6c82210fc99724651e5f30360820151a7b73720a2d` |

All of them stay outside the repository, in `~/.local/state/songhealth-migration/`.
`verify-report.json` is the one verify's second run wrote, after the walkthrough's first answer.

**Plan, with the current Classification list as it stands:** 411 rows; News 41, Activity 339,
Announcement 25, Document 2 and ต้องเลือก 4. The four rows took their default, Activity:
`news-154`, `news-290`, `news-359` and `news-360`. 1,002 of the 1,115 attachments are used, and
attachment 1479 is missing. The dry run planned 1,001 files, none missing, and wrote an
`import-plan.json` byte-identical to the copy kept from before the round.

## The import

Run with `node scripts/migration.ts import`, after `demo-dataset.ts remove` (03:14:58Z to
03:17:41Z). It took 167 s, from 03:17:41Z to 03:20:28Z.

| Legacy group | Target | Items |
| --- | --- | --- |
| `public-new` | Activity | 343 |
| `public-new` | News | 41 |
| `directive` | Announcement | 5 |
| `directive` | Document | 2 |
| `procurement` | Announcement | 20 |
| `post` | MOIT | 66 |

The 25 Announcements' files add 26 more Documents, so the target holds 28 Documents. Files: 1,001
used, 957 uploaded, 44 reused as the same bytes as another upload, none missing. Redirects: 490.
Report notes: 44.

The Media Library, read through the native API in the window, held 957 items in 6 folders:

| Folder | Items |
| --- | --- |
| ITA 2567 | 171 |
| ITA 2568 | 167 |
| ITA 2569 | 171 |
| ITA ใช้ทุกปี | 32 |
| เว็บไซต์เดิม: ข่าวและกิจกรรม | 387 |
| เว็บไซต์เดิม: ประกาศและเอกสาร | 29 |

## Verify

`node scripts/migration.ts verify` took 46 s and reported, with its last line
`VERIFY: PASS, redirects waiting for a page staff write: 2`, and no failure:

| Check | Result |
| --- | --- |
| Entries found in their collection | Activity 343 of 343, News 41 of 41, Document 28 of 28, Announcement 25 of 25, MOIT 66 of 66 |
| Files | 1,001 planned, 1,001 in the library, 1,001 in their folder |
| Pages | 503 of 503 |
| Redirects | 488 of 490, the other 2 waiting for staff content |
| Direct file addresses answering 404 | 1 of 1 |
| Announcements listing their Documents | 25 of 25 |
| Documents offering their file | 28 of 28 |
| MOITs showing their Evidence | 66 of 66 |
| Fiscal years listing their MOITs | 3 of 3 |

The second run, after the walkthrough's first answer, took 40 s and ended with the same last line.

**Destinations pending staff content:**

- `/history/` and `/role/` go to `/about/organization`, a Basic Page that answers 404 until it is
  published. These are verify's 2.
- `/office-policy/`, `/officer/` and `/sub-district-health-promoting-hospital/` go to
  `/about/policies`, `/about/personnel` and `/health-services`. Those answered 200 with their empty
  states, since the staff content is not there yet. Verify counts them as passed.

**A scratch read-back over HTTP, in the window:**

- Each list's dates against the plan, through every page, found none out of order: `/activities`
  343 entries on 29 pages, with 3 pairs sharing a timestamp as #178 noted; `/news` 41 on 4 pages;
  `/news/health` 40 on 4 pages; `/announcements` 25 on 2 pages.
- `/news/health` offered the topic ฝุ่น PM 2.5, `/documents` offered the type คำสั่ง, and
  `/documents?type=order` listed 2 Documents.
- One sample of each redirect kind answered one 301 to a page answering 200, except the 2 above.
- A direct file address, an archive and a feed answered 404. `/?p=…` and `/?attachment_id=…` showed
  the homepage at 200, as the Product Owner kept (#181 comment 6730656278).

## ADR 0002's latency at the real volume

`scripts/measure-latency.ts`, 50 requests per path after 3 to warm up, one at a time, on
`astro dev`, so these are development figures, not production's. A scratch module gave it these
paths and no content, so its second pass repeats the first. The search paths are those #63
measured. The lists are ADR 0004's "about 200 ms" revisit and #176's note. The demo dataset's run
came before the window, at the same commit.

| Path | Demo dataset, first pass: median / p95 / max | Imported, first pass | Imported, second pass |
| --- | --- | --- | --- |
| `/search?q=สาธารณสุข` | 61 / 81 / 107 ms | 93 / 144 / 164 ms | 91 / 135 / 215 ms |
| `/search?q=ไข้เลือดออก ยุงลาย` | 55 / 66 / 80 ms | 90 / 102 / 104 ms | 89 / 107 / 111 ms |
| `/search?q=คำที่ไม่มีในเนื้อหา` | 54 / 68 / 92 ms | 103 / 134 / 163 ms | 84 / 103 / 107 ms |
| `/search?q=สาธารณสุข&group=health&page=5` | 56 / 69 / 97 ms | 108 / 153 / 162 ms | 103 / 144 / 178 ms |
| `/search?q=สาธารณสุข&group=news&page=5` | 54 / 63 / 64 ms | 108 / 153 / 179 ms | 100 / 127 / 139 ms |
| `/news` | 48 / 58 / 61 ms | 59 / 70 / 83 ms | 53 / 77 / 89 ms |
| `/news/health` | 57 / 67 / 77 ms | 70 / 108 / 125 ms | 61 / 74 / 83 ms |
| `/activities` | 46 / 52 / 56 ms | 65 / 78 / 82 ms | 67 / 107 / 138 ms |
| `/announcements` | 48 / 61 / 63 ms | 46 / 55 / 115 ms | 42 / 46 / 47 ms |
| `/documents` | 68 / 85 / 122 ms | 61 / 69 / 82 ms | 57 / 64 / 79 ms |
| `/ita/<year>` (2570 on the demo dataset, 2569 imported) | 44 / 57 / 104 ms | 46 / 62 / 73 ms | 42 / 51 / 109 ms |

The Product Owner judged the search figures (#184 comment 6731579516): **"ยอมรับ (Recommended)"**,
keeping ADR 0002's approach. #63's run with 1,000 synthetic entries had medians of 165 to 180 ms. No
list passes ADR 0004's "about 200 ms". The Thai search UAT with staff stays a separate item.

## The Product Owner's walkthrough

The steps were given numbered in the session, and the answers are on #184 with their words and
descriptions (comments 6731579516 and 6731829261). The application log of each span was read before
the restore, while the trial could still be walked.

- **First answer, "ผ่านทุกขั้น".** The log's public-page requests ran from 03:30Z to 03:32Z and
  covered part of steps 1–5. Steps 6–10 (ITA, the renamed MOIT's old address, the redirects, the
  direct file address, the Admin) held no request. The Product Owner was shown this and chose
  "กลับไปตรวจตอนนี้ (Recommended)".
- **Second answer, "ตรวจแล้ว ผ่านครบ".** The span 03:38:16Z to 03:46:50Z held the rest.
- **The Admin:** the Product Owner opened it, and edited and published one News entry twice, which
  the restore removed. The two publish lines are in the Admin change log, at 03:41:17Z and
  03:41:28Z.

| The ticket's item | Opened by the Product Owner | The automated check |
| --- | --- | --- |
| The lists and their date order | `/activities`, `/news`, `/news/health`, `/announcements`, `/documents` | The read-back's order, through every page |
| A PM 2.5 report, and #178's two awkward News | `news-288`, `news-259`, `news-252` | verify's Pages |
| An Activity with its One Page | `news-384`, and three others | verify's Pages |
| An Announcement with its Documents | `directive-5`, `directive-6`, `procurement-6`, `procurement-20` | 25 of 25 listing their Documents |
| An order under the คำสั่ง filter | `/documents` (the log drops query strings), and `directive-1`'s and `directive-4`'s Document pages | 2 Documents under `?type=order` |
| One MOIT per year with its Evidence | `/ita/2567`, `/ita/2568`, `/ita/2569`, and MOIT pages of each year | 66 of 66 showing their Evidence |
| A sample of redirects of each kind | 7 addresses of the news, directive, procurement and page kinds; the MOIT kind is below | 488 of 490 |
| A direct file address answering 404 | yes | 1 of 1 |
| The Admin without Categories and Tags | the Admin's pages | The runtime verify's content-model check |
| The list filters | `/news/health`, `/documents` | The read-back's filters |

**Not opened in either span:** `/moit-4-2567-2/`, the renamed MOIT's old address, and its
destination; `/ita/moit-2-2567`, ANOM-001's page; `/ita/moit-5-2569`; `/announcements/directive-2`;
the Media Library's folder list; and a Document's file. The automated checks answered for them:

- `/moit-4-2567-2/` answered one 301 to `/ita/moit-5-2567`, which answered 200;
- the two MOIT pages and `directive-2` answered 200;
- verify read 28 of 28 Documents offering their file, by each link's name and not the file's bytes;
- the native API gave the folder table above.

The Product Owner accepted the walkthrough with these named (#184 comment 6731829261):
**"รับตามที่ walk (Recommended)"**.

**What this round could not show:**

- **An Activity's gallery,** which the ticket names. No migrated Activity has one: the only extra
  ACF pictures in the news stream are the three in `news-259`, a News, and they follow its text.
- The current fiscal year's Summaries and the Classification review (#182). Four rows are at their
  default.
- The pages that wait for staff content, and the demo dataset's pages, which were empty in the
  window.
- Links inside migrated text. The 27 in the News bodies all go to one other site, as #181 noted.
- A real phone, since the runtime is loopback-only.

## After the restore

`dev-runtime-restore.sh --confirm` with the window's backup, 03:48:03Z to 03:48:23Z, with its
post-restore verification PASSED.

| Check | Command | Result |
| --- | --- | --- |
| Runtime | `dev-runtime-verify.sh` | VERIFY: PASS at `7ad32a84986635c20ea2bfe26686d188fc53fe16`, after the restore and after T021 |
| Demo dataset | `demo-dataset.ts add` | wrote nothing: "the demo dataset is installed: 60 entries, 21 terms, 45 pictures and files" |
| Its addresses and the trial's | `curl` | a demo News, Activity and MOIT 200; `news-288`, `news-384`, `moit-2-2569` and a `/public-new/` address 404 |
| Types, before the window | `npm run typecheck` | 0 errors, 0 warnings, 2 hints |
| Node seam, before the window | `npm run test:node` | 683 of 683 passed |
| Browser seam, serial | `scripts/dev-runtime-env.sh npm run test:browser -- --workers=1` | 362 passed, 14 skipped, in 14.3 minutes, from 03:49:54Z to 04:04:13Z |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | 14 of 14 passed, no owned-fixture residue |
| Residue | `dev-runtime-residue.sh` | RESIDUE: NONE |

The 14 skipped tests are T021's, which skip outside their coordinator. CI runs the build,
`format:check`, `knip`, `jscpd` and `lint:shell` on this branch's pull request.

**404 log.** It held 50 synthetic misses and 2 others, `/ita/2569` and `/news/public`. Both are
Claude Code's own probes of 03:12:41Z, before the window, of addresses the demo dataset does not
have. They are in the window's backup, so the restore kept them. Clearing them is the Product
Owner's, with `--clear-404-log-including-others`.

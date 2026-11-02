# Legacy ITA on songhealth.moph.go.th

What the legacy WordPress site publishes for ITA, checked on 2026-11-02 for the ITA re-entry grill
(Feature 004). The sources are the site's public WordPress REST API (`/wp-json/wp/v2/`) and its
public pages; no credentials were used. The site's TLS certificate had expired, so the requests
skipped certificate verification.

## Summary

- Three fiscal years are published, 2567, 2568 and 2569, each with MOIT 1–22: 66 posts, 650
  evidence links and 581 distinct PDF files. ITA 2570 does not exist yet.
- Evidence is a numbered list of links inside each MOIT post, typed by hand in the block editor.
  One staff account wrote all 66 posts.
- The structure is the same every year: 22 indicators, numbered requirements, sub-items, and
  usually three PDFs per sub-item.
- Defects: an expired certificate, a missing file (ANOM-001), a broken link, wrong month labels,
  inconsistent addresses, navigation that crosses years, evidence that points at live pages, and
  last year's evidence left under the new year.

## Where ITA lives

- **Menu:** "ITA", which links nowhere, opens 2569, 2568 and 2567 (home page HTML).
- **Fiscal year:** pages `ita-2567` (id 942), `ita-2568` (id 2096) and `ita-2569` (id 4657), headed
  "MOPH ITA 25xx". Each links its own 22 MOIT posts and no other year's (`pages` API).
- **MOIT:** a post in category ITA (id 5), tagged with its year and indicator, such as `2569` and
  `MOIT-1` (`posts?categories=5`). Every post is block-editor lists, paragraphs and headings.
- **Evidence:** links in those lists, mostly PDFs in the media library (post `content`).
- `/ita-2570/` answered 404 on 2026-11-02.
- **Dates:**
  - the 2567 posts were created from 2024-09-30 to 2024-11-21, after that fiscal year ended, and
    all were edited on 2024-12-15;
  - every 2568 post was created on 2024-12-12, and every 2569 post on 2026-02-25;
  - the last change was on 2026-10-06 (2569 MOIT 2).

## Evidence

- A MOIT post holds numbered requirements, then sub-items, then links. For example, 2569 MOIT 1 has
  "1. คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง" with items 1.1–1.4 and "2. รายงานการกำกับติดตาม…" with
  items 2.1–2.3.
- A sub-item usually carries three PDFs:
  - a memo asking the director to publish (บันทึกเสนอ ผบห.);
  - the document itself;
  - the publication form (ฟอร์มเผยแพร่).
- Evidence arrives in two rounds. In 2569 MOIT 5, the monthly procurement reports for ต.ค. 2568 to
  มี.ค. 2569 were uploaded in 2026-03, and those for เม.ย. to ก.ย. 2569 in 2026-09.

| Year | Evidence links | PDF links | Distinct PDFs | Most links in one MOIT |
| ---- | -------------- | --------- | ------------- | ---------------------- |
| 2567 | 227            | 201       | 196           | 38 (MOIT 2)            |
| 2568 | 211            | 208       | 208           | 43 (MOIT 2)            |
| 2569 | 212            | 207       | 206           | 42 (MOIT 2)            |

The counts leave out the two tag links that every post carries.

- **Other evidence kinds:**
  - five links to live site pages (ANOM-004): `/officer/` and `/public-news/` from 2568 and 2569
    MOIT 2, and one news item from 2569 MOIT 20;
  - four WebP images (news infographics) in 2567 MOIT 2;
  - external sites: stopcorruption.moph.go.th from 2568 and 2569 MOIT 2, which timed out on
    2026-11-02, and www.fda.moph.go.th from 2569 MOIT 2;
  - a Facebook profile link without text in every 2567 post.
- **Reuse:** 26 files are linked from more than one year, 5 of them from all three (the MOPH vision
  and the ethics laws and codes). 2569 links 21 files uploaded in 2024.

## Defects

1. The TLS certificate (DigiCert) expired on 2026-10-31 at 23:59:59 GMT, so every visitor gets a
   browser warning (`openssl s_client`).
2. ANOM-001 is still open: attachment 1479, a national-strategy plan linked from 2567 MOIT 2,
   answers 403 (`media/1479`, HTTP check).
3. In 2569 MOIT 5, the memo for item 2.2 (May 2569) links a path without `/wp-content` and answers
   404; the file exists at the correct path (HTTP check).
4. In 2569 MOIT 5, items 1.4–1.6 label ม.ค., ก.พ. and มี.ค. as 2568 instead of 2569 (post text).
5. In 2568 and 2569 MOIT 2, item 10 has a link whose text is ")" (post content).
6. The addresses are inconsistent (`posts` API):
   - 2567 MOIT 5 has the slug `moit-4-2567-2`;
   - 2569 MOIT 16 has a long Thai slug;
   - the other 64 posts follow `moit-N-25xx`.
7. Navigation crosses years (post HTML):
   - previous and next links and "related posts" jump to another year (`moit-1-2569` →
     `moit-3-2568`);
   - the ITA category archive mixes all years by date.
8. The link text is generic (post content):
   - "ฟอร์มเผยแพร่" 135 times, "บันทึกเสนอ" 43, "รายงาน สขร.1" 36 and "บันทึก" 33;
   - only the numbering around a link says what it is.
9. Most PDFs have random file names, such as `yG1MZSf8xE-1773044919.pdf` (links).
10. Live-page evidence changes after its year: 2568 MOIT 2 links the executive list, which now shows
    today's executives (links).
11. ANOM-005: the ethics page (`/ethics/`, id 2909) repeats the MOIT 15 and 16 evidence. It says
    2569, but its 12-month links are files uploaded in 2025-09, which belong to fiscal 2568 (`pages`
    API).
12. Evidence carried over from the previous year: in 2569 MOIT 2, both 12-month links (item 10 and
    item 11.2) are the same two files, with the same labels, that 2568 MOIT 2 links for its
    12-month round, uploaded in 2025-09. They were still in place after the post's last edit on
    2026-10-06 (post content of both years, upload paths).
13. "รอบ" means two things: the ITA round (6-month and 12-month), and a content period such as 2569
    MOIT 7's "รอบ 6 เดือน (1 เมษายน 2568 – 30 กันยายน 2568)", a performance-evaluation cycle
    (post text).

## What a better ITA should address

These are inputs to the grill, not decisions.

- One address per year and per indicator, and no navigation into another year (defects 6 and 7).
- Evidence labels that carry their context (indicator, requirement, month or round), not
  "ฟอร์มเผยแพร่" alone (defect 8).
- The two rounds visible on the page, so an assessor sees what each round added, and one meaning
  for "รอบ" (defect 13).
- A way for staff to clear last year's evidence before they publish a new year (defect 12).
- Files picked from the media library rather than pasted as links, so a typo cannot break a link
  (defect 3).
- Standing documents (laws, codes, the MOPH vision) reused across years from one file, as staff do
  now.
- A rule for live-page evidence, which shows today's data under a past year (defect 10).
- The year list and the menu built from the content, so staff do not edit a menu each year.
- A second trained maintainer, since one account wrote all 66 posts.

## Sources

- WordPress REST API, read on 2026-11-02: `https://songhealth.moph.go.th/wp-json/wp/v2/` with
  `categories`, `posts?categories=5`, `tags`, `pages?search=ITA`, `pages?slug=ethics` and
  `media/1479`.
- Public pages read on 2026-11-02: `/`, `/category/ita/`, `/ita-2569/`, `/moit-1-2569/`,
  `/moit-2-2569/` and `/moit-5-2569/`.
- HTTP checks of all 616 distinct link targets on 2026-11-02 (ranged GET, four at a time), with
  failures retried once.
- Certificate: `openssl s_client -connect songhealth.moph.go.th:443`.
- ANOM-001, ANOM-004 and ANOM-005: `docs/website-modernization-docs/current/09-migration-plan.md`
  §12.

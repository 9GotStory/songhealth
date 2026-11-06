# The Legacy site's content for the migration

What the WordPress site at songhealth.moph.go.th holds, read on 2026-11-06 for Feature 005, the
WordPress migration (`09`), after its grill (ADR 0008). The sources are a WXR export of all content
that the Product Owner made that day and a copy of the site's `wp-content` folder. Both stay
outside the repository, because the export holds an author's email and a form submission. This
file records counts and structure only: no titles of unpublished items and no personal data.

## Summary

- The migration covers 384 news items, 66 ITA posts, 7 directives and 20 procurement notices,
  every one of them published, and 13 published pages.
- The news stream keeps no text in the block editor. Its pictures and its only text sit in ACF
  fields: 383 items are a One Page alone, and 27 PM 2.5 daily reports carry their text.
- The legacy categories split the news stream without overlap: 343 กิจกรรม, 39 ประชาสัมพันธ์
  (38 of them PM 2.5) and 2 without a category, both PM 2.5 reports (ANOM-002).
- 1,002 of the 1,115 attachments belong to those items. Their files total 699 MB, and only
  attachment 1479 (ANOM-001) is missing from the uploads.
- Every page is an Elementor layout.

## The export and the files

- **WXR 1.2, all content:** one author, the items below, and plugin records the migration leaves
  out. Those are 46 ACF field definitions in four groups, 15 menu items, 11 Elementor templates,
  11 slider slides, 4 popups and 8 popup themes, one Ninja Forms submission, custom CSS and the
  global styles.
- **`wp-content.zip`:** 24,554 entries, 1.6 GB uncompressed. `uploads` holds 5,889 files
  (1.26 GB) in the folders 2024, 2025 and 2026 and in plugin folders, among them the form plugins'
  `forminator` and `wpforms`. The zip holds no database backup: `ai1wm-backups` and
  `aiowps_backups` contain only placeholder files.

## The news stream (`public-new`, "ประชาสัมพันธ์")

- 384 items, published from 2024-10-10 to 2026-11-02, at `/public-new/news-N/`.
- **Categories** (`category-public-news`): กิจกรรม alone 343; ประชาสัมพันธ์ with its child
  PM 2.5, 38; ประชาสัมพันธ์ alone, 1; none, 2. No item carries both กิจกรรม and ประชาสัมพันธ์, and
  the type has no tags. The two items without a category, `news-94` and `news-96`, are PM 2.5
  reports.
- **Text:** the block-editor content is empty in every item. The ACF field `editor` (WYSIWYG) holds
  text in 27 items, all PM 2.5 daily situation reports (19 from 2025-03, 4 from 2025-04 and 4 from
  2026-02). Each is about 2,860 characters of HTML with headings, lists and bold text.
- **Pictures:** every item has a featured image, and the ACF field `image_1` repeats it in 383
  items. Four more pictures sit in `image_1`–`image_5` across the stream. The fields `file_1`–
  `file_5` are never used.
- 382 of the 387 pictures are portrait One Pages. The median file is 526 kB and the largest 0.8 MB,
  196 MB in all.

## Directives and procurement notices

- **`directive`:** 7 items at `/directive/directive-N/`, in the categories คำสั่ง (2) and ประกาศ
  (5). Six items have one file and one has two; three of the files have a label in `text_N`, and
  one item has an ACF image. The block-editor content is empty.
- **`procurement`:** 20 items at `/procurement/procurement-N/`, in the categories
  ประกาศผู้ชนะการเสนอราคา with its child เฉพาะเจาะจง (17), ประกาศผู้ชนะการเสนอราคา alone (1) and
  ขายทอดตลาด (2). Each has one unlabelled file.
- Directives use 10 attachments, the largest 33.9 MB, and procurement notices 21, the largest
  4.2 MB.

## ITA posts

- 66 posts in the category ITA, 22 for each fiscal year from 2567 to 2569, as
  `docs/research/legacy-ita.md` describes.
- **Links in their content:**
  - files: 612 root-relative and 7 absolute links into `/wp-content/uploads/`, and 1 to an uploads
    path without `/wp-content` (defect 3 there);
  - 5 to pages of the site (ANOM-004);
  - 22 to Facebook, in the 2567 posts;
  - 3 to other government sites.
- They use 584 attachments. 583 of the files are in the zip: 435 MB in all, a median of 244 kB, the
  largest 28.2 MB.
- **ANOM-001:** the export lists attachment 1479, whose file
  `wp-content/uploads/2024/11/7-ยุทธศาสตร์ฯ-แผนแม่บทภายใต้ยุทธศาสตร์ชาติฯ-…-ของประเทศ.pdf` is not in
  the uploads; that month's folder holds 198 other PDFs.

## Pages

13 published pages and one draft, every one an Elementor layout: `history`, `role`,
`office-policy`, `ita-2567`, `ita-2568`, `ita-2569`, `officer`,
`sub-district-health-promoting-hospital`, `home`, `public-news`, `ethics`, `procurements` and
`directives`.

## Attachments

- 1,115 in all: 653 PDF, 458 WebP, 2 SVG, 1 spreadsheet and 1 font, uploaded in 2024 (293), 2025
  (445) and 2026 (377).
- 1,002 belong to the news, ITA, directive and procurement items. The other 113 (64 WebP, 45 PDF
  and 4 more) belong to none, against ANOM-008's 81 in the 2026-08-28 baseline.
- The 1,001 files present weigh 699 MB. The largest, 33.9 MB, is under EmDash's default upload
  limit of 50 MB (`docs/agents/emdash-1.1.0.md` "Media").

## What the counts mean for the migration

These follow from the grill's decisions (ADR 0008); the Feature 005 spec states them as rules.

- The Classification list starts with 343 Activities and 41 News: the 38 PM 2.5 items, the one
  other ประชาสัมพันธ์ item and the two uncategorised PM 2.5 reports.
- The 27 PM 2.5 reports bring their text into the News body. No Activity has text, so the rule
  that puts an Activity's text into its Summary applies only to an item the list moves from News.
- An Activity's gallery receives at most the four extra pictures.
- ANOM-001 needs the file from the office, or a link to the official source instead.

## Sources

- WXR export `WordPress.2026-11-06.xml` (9.6 MB, SHA-256
  `ded5153de20c65bf3e451883791a1ba35a5253fc2381b54a42e4419f9ea93556`) and `wp-content.zip`
  (1.32 GB, SHA-256 `baf43c3b40ccc0a67c26996c4ceefed811020012f4465380c5c73c9e2aee0057`), both
  provided by the Product Owner on 2026-11-06 and kept outside the repository.
- WordPress REST API on 2026-11-06: `X-WP-Total` of `posts`, `pages`, `public-new`, `directive`,
  `procurement` and `media`, which match the export's published counts.
- Read with aggregate-only Python scripts (`xml.etree`, `zipfile`) that print counts, never titles
  of unpublished items or personal data.

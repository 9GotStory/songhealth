---
status: accepted
---

# ITA Evidence is blocks on one entry per MOIT per fiscal year, with no historical-evidence guard

The Product Owner put ITA back into V1 scope on 2026-11-02, before the WordPress migration
("ใช่ อยากทำ ita ก่อน"), so the deferral in `00` §7.10, `02` §18, `03` §11, `05` §7 and `10` §15
is amended by Feature 004. Feature 002 had deferred ITA because its FR-017 asked for immutable,
historically complete Evidence, and EmDash 1.1.0 has no native guard for that: replacing a media
item overwrites its stored file, deleting one is not blocked by its use in content, and revisions
are pruned (`specs/002-cms-content-model/phase0-options.md`). The legacy site publishes each MOIT
as a post whose Evidence is a hand-typed list of links; its defects are recorded in
`docs/research/legacy-ita.md`.

Songhealth therefore models ITA as follows (grill of 2026-11-02, answered "ตามแนะนำ" and confirmed
"ยืนยัน"; prototype reviewed the same day, `docs/prototypes/ita-moit-page.md` on the branch
`prototype/ita`):

- **One entry per MOIT per fiscal year**, in one collection, with the fiscal year and the MOIT
  number as fields. The ITA year list and each year's page are built from the published entries:
  there is no year record and no menu to edit each year.
- **Evidence is a `blocks` field on the MOIT.** A Requirement block (its number and title) is
  followed by the Evidence under it: a file block holding a file from the media library, or a link
  block holding a URL, each with an optional Round. Staff pick files; they never paste a link to a
  file. Evidence that points at a live page of the site is allowed for requirements about current
  information and is labelled as current.
- **A new year starts by duplicating last year's MOIT**, then changing the year and the slug and
  clearing last year's Evidence before publishing.
- **No historical-evidence guard is built.** V1 relies on native records and on precautions: a
  published Evidence file is never replaced or deleted (a correction is a new file), the media
  library's "Used in" tab is checked before any deletion, and entry revisions, the Admin change log
  (ADR 0005) and the backups record what changed. Where a file is gone, the page shows the same
  unavailable state as a Document. The Feature 004 spec supersedes FR-017's wording.

## Considered options

- **Keep ITA on WordPress** until the migration: the deferral as written. Rejected by the Product
  Owner: the legacy site's certificate has expired, the fiscal year 2570 rounds are due, and the
  office wants the ITA better than before, not copied.
- **Rich text with links**, as the legacy site: a typo breaks a link, labels lose their context,
  and nothing says which Round or Requirement a file belongs to (legacy defects 3, 8 and 12).
- **One entry per piece of Evidence**, referenced from the MOIT: hundreds of entries a year, a
  reference picker per item, and no way to start a year by duplicating.
- **A repeater field:** a repeater sub-field cannot be a file (`docs/agents/emdash-1.1.0.md`
  "Admin input").
- **A Songhealth immutable-evidence subsystem** (write-once media, usage locks, retained
  revisions): custom code around EmDash's media and content stores, against "platform-native
  first", for a guarantee the assessment does not require of the website.

## Consequences

- A blocks field holds at most 100 blocks. The largest legacy MOIT needs about 65 (MOIT 2: 22
  Requirements and 41 pieces of Evidence). The Admin shows every block expanded and does not keep
  a block collapsed across a reload, so MOIT 2's form is long; the Product Owner accepted this
  for V1 on 2026-11-02 ("ตามแนะนำทั้ง 3 ข้อ"), with Evidence labels that start with their number
  so the collapsed headers read well.
- Block types are schema. EmDash 1.1.0 creates and updates them through
  `/_emdash/api/schema/block-types` and has no route that deletes one, so Songhealth's
  model-update step learns to create and update them, and a retired block type stays.
- Schema slugs allow letters, digits and underscores only, and an entry's slug is unique within
  its collection, so a MOIT's slug carries its year. The spec settles the URL shape, the Round
  options (a chosen select cannot be cleared in the Admin, so an optional Round needs an explicit
  "no round" option) and how the page shows when a MOIT was last updated.
- Feature 005, the WordPress migration, maps the legacy years' Evidence into blocks and fixes the
  recorded defects at import, instead of copying the posts.
- PDFs stay downloads: EmDash serves them as attachments, which protects visitors from scripted
  PDFs, and the Product Owner kept that for ITA and Documents alike (2026-11-02).

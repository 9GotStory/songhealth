---
status: accepted
---

# The WordPress migration is a Songhealth script on EmDash's native APIs, not EmDash's import

`09` §4 and `10` §16 make EmDash's own WordPress import the first path, and `09` §16 allows custom
migration code only where that import cannot map the content. Reading EmDash 1.1.0 for Feature 005
on 2026-11-06 showed that the import cannot bring the Legacy site into Songhealth's model
(`docs/agents/emdash-1.1.0.md` "WordPress import"):

- The WXR and Exporter-plugin paths write the fixed fields `title`, `content`, `excerpt` and
  `featured_image`, and the Admin's prepare step adds the missing ones to the target collection.
  Importing into `news` or `activities`, whose text fields are `body` and `summary`, would add two
  fields that no page shows; without that step the insert fails.
- A mapping sends one post type to one collection, while the Legacy site's one "ประชาสัมพันธ์"
  stream, `public-new` (384 items), holds News and Activities alike.
- ACF values land only in fields with the same slug, while the 27 directive and procurement items
  keep their files in ACF fields `file_1` to `file_5`.
- The 66 ITA posts become MOIT entries with Evidence blocks (ADR 0006), and the 13 pages are
  Elementor layouts.

Every legacy group meets one of `09` §16's reasons for custom code, so the import would only add a
detour. The Product Owner chose the following in the grill of 2026-11-06 (answered "ตามที่แนะนำ",
confirmed "ตามที่แนะนำ ยืนยัน"):

- **One temporary Songhealth script** in `scripts/` reads a WXR export per post type and a copy of
  `wp-content/uploads`. It writes through EmDash's native APIs: content, media (an upload with the
  same content hash reuses the existing item; imported files go into Media Library folders),
  taxonomy terms and redirects. The model stays as `seed/seed.json` defines it.
- **People decide what each item becomes.** The Classification list (`GLOSSARY.md`) names the
  target of each `public-new`, directive and procurement item, with defaults from the legacy
  categories, and carries the Summaries staff write. The script reads it.
- **The same script runs the trials and the final import.** A trial runs on the development
  runtime between a backup and its restore. The final import runs once into production after a
  content freeze, with no delta, and the production track runs it under its own authorization
  (`09` §18).
- The script and its tests leave the repository when WordPress is retired. The export, the
  Classification list and the import reports never enter it.

## Considered options

- **EmDash's import straight into Songhealth's collections:** it adds `content` and `excerpt` to
  the model, sends all of `public-new` to one collection, and still needs a script for every group.
- **EmDash's import into temporary collections, then a script that moves the entries:** it keeps
  EmDash's media copy and link rewriting, but the import runs twice, its bylines and
  Categories/Tags terms need cleaning up, and EmDash cannot move an entry to another collection,
  so every move is a re-create anyway.
- **The EmDash Exporter plugin:** it installs code on the live Legacy site, and it writes the same
  fixed fields.
- **The public REST API as the source:** it gives published items only, the Legacy site's
  certificate has expired, and EmDash's REST source only probes a site.

## Consequences

- `09` §4 and §16 and `10` §16 are amended: for this site the path is EmDash's native APIs, not
  its WordPress import.
- EmDash's media step and link rewriting are not used, so the script relies on the upload's
  content-hash reuse and rewrites the links inside migrated text itself.
- The script adds `sax` 1.6.1 and `@emdash-cms/gutenberg-to-portable-text` 1.1.0 to
  `devDependencies`, the versions EmDash already installs, to read WXR and convert block-editor
  HTML.
- Categories and Tags, which only EmDash's import fills, are deleted from the model.
- `10` §16's rerun guard, for a slug changed between an import and its delta, does not arise:
  there is one final import, and it stops on a slug that already exists.

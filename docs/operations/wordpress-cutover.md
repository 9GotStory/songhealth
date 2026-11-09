# WordPress migration: production import and cutover runbook (Feature 005)

How the Legacy site's content moves into production and the domain moves to Songhealth, as the trial
on the development runtime proved it (`docs/evidence/184-trial-import.md`).

**Status: NOT AUTHORIZED.** `09` §18 keeps the production import, the final cutover and WordPress's
retirement NOT AUTHORIZED. The production track runs this runbook under its own authorization
(spec #174). Nothing here has run in production, and the script has run only against `astro dev`.

**Authority:** `docs/website-modernization-docs/current/09-migration-plan.md`,
`docs/adr/0008-wordpress-migration-through-a-songhealth-script.md` and spec #174. Where this file
and `09` differ, `09` wins and the difference goes to the Product Owner.

## Who acts

| Role | Who | Acts on |
| --- | --- | --- |
| Product Owner | the Product Owner | authorization, the freeze, the export and the zip, every stop, the go for DNS |
| Staff | an Editor or above, unless a step says otherwise | content in production, the Classification list, Summaries, Featured |
| Administrator | the account whose API token runs the import; migrated items belong to it (`05` §5.2) | the token, the 404 log, new redirects |
| Operator | the person with a shell on the production host, named by the production track | every command below |
| DNS holder | whoever controls the domain's records, named by the Product Owner | the DNS switch |

## Setup for the commands

Run on the production host, from a checkout at the deployed commit, on the Node `package.json`
pins (26.13.0), with `npm ci --include=dev`: the script needs the converter in `devDependencies`.

```bash
STATE=<a folder outside the repository, mode 0700>
EXPORT=$STATE/<the WordPress export>.xml
ZIP=$STATE/wp-content.zip
ORIGIN=http://127.0.0.1:4321   # the proxy's upstream (`production-foundation.md` §10): until the DNS switch the public origin is WordPress
TOKEN=$STATE/import-token      # mode 0600; the script refuses any other mode
```

`classification-list.csv`, `inventory.json`, `anom-001.pdf` and the reports sit beside `$EXPORT`.
All of them stay outside the repository. A record of this run holds counts, checks and digests only.

## Before cutover

1. **The gates (Product Owner).** Authorization of the production import and the cutover (`09` §18).
   Feature 001's T022 and T028 have passed. #218 is done: the reverse proxy pins the `Host` and limits
   `/_image`.
2. **The production Admin's address (Operator, Product Owner).** Passkeys are bound to the origin in
   `EMDASH_SITE_URL` (`production-foundation.md` §10), and the domain still points at WordPress until
   the DNS switch. **Open (#218):** the production track decides how staff reach the Admin at that
   origin before then, and names it here.
3. **The token (Administrator).** Admin → ตั้งค่า → API Tokens (`/_emdash/admin/settings/api-tokens`),
   signed in as the Administrator who will own the migrated items. Create a token with the `admin`
   scope, which the redirect routes need (`docs/agents/emdash-1.1.0.md` "Native API for tests"), and
   the shortest expiry that spans the cutover. Paste it at this silent prompt, so that it never goes
   on a command line:

   ```bash
   (umask 077; IFS= read -rs token && printf '%s\n' "$token" > "$TOKEN")
   ```

4. **The model-update step (Operator).** Its deletion of Categories and Tags has no undo but a
   restore, so a production backup (step 10) comes first:

   ```bash
   node scripts/model-update.mjs --origin "$ORIGIN" --check < "$TOKEN"   # 0: nothing pending, 3: changes pending
   node scripts/model-update.mjs --origin "$ORIGIN" < "$TOKEN"
   node scripts/model-update.mjs --origin "$ORIGIN" --check < "$TOKEN"   # must exit 0
   ```

   Then the check of `production-foundation.md` §7.4 step 3, at this stage through `$ORIGIN` and the
   address of step 2: the homepage answers 200, and the Admin's "จัดการ" lists no Categories or Tags.

5. **Staff content in production (Staff).** Entered from authoritative sources, in the Admin:

   | Address | What staff enter | What verify says of it |
   | --- | --- | --- |
   | `/about` | the Basic Page with slug `about`, published | not checked |
   | `/about/organization` | the Basic Page with slug `organization`, published | `/history/` and `/role/` wait for it (see Verify) |
   | `/about/leadership` | Personnel with a leadership order | not checked |
   | `/about/policies` | Documents of the type นโยบาย | passes on its empty state: check by eye |
   | `/about/plans`, `/about/results` | Documents of the types แผนงาน and ผลการดำเนินงาน | not checked |
   | `/about/personnel` | Personnel (ANOM-007) | passes on its empty state: check by eye |
   | `/health-services` | Health Services (ANOM-006) | passes on its empty state: check by eye |
   | `/services` | Services | not checked |
   | Admin → ตั้งค่า (an Administrator) | site settings and the logo; check the header, the footer and the OG image | not checked |

6. **The Classification list and the Summaries (Staff; #182).** Every row reviewed, no ต้องเลือก left,
   and a Summary for each News and Activity of the current fiscal year.
7. **ANOM-001 (Product Owner).** The office confirms that `anom-001.pdf` is the document, and the
   confirmation is recorded on #180: the legacy label names four documents and the PDF holds only the
   National Strategy. Without the file a run links `ANOM_001_SOURCE`, an address nobody has confirmed,
   and the import report says so.
8. **The list and the PDF on the host (Operator).** Copy the reviewed `classification-list.csv` and
   the confirmed `anom-001.pdf` from where the review kept them into `$STATE`, over a private channel
   and never through the repository: `plan` without the list starts every row at its default.
9. **The freeze's date, and DNS's TTL (Product Owner, DNS holder).** Tell staff the date. Lower the
   record's TTL at least one old TTL before the switch.
10. **The backups of `09` §15.**
    - **Production database and media (Operator):** one before step 4, and one after staff's last
      change, again if anyone writes to production before the import. **Command: none yet.**
      `scripts/backup-foundation.sh` is the only production backup in the repository, and it produces
      nothing unless the site's tagline is the validation value of Feature 001's T015, so it cannot
      back up a site with real settings. **Open (#221):** the production track supplies the command,
      proves it with T028's drill and names it here. The cutover stops here until it exists.
    - **WordPress database and files (Product Owner):** with the WordPress host's own tools, just
      before the freeze. `wp-content.zip` holds no database, so it is not this backup.

## Cutover

Allow for the import and verify: on the development runtime the import of everything took 167 s and
verify 40 to 46 s (`astro dev`, so these are not production's figures).

1. **The freeze (Product Owner).** Nobody publishes or edits on WordPress until the rollback window
   ends or the cutover is abandoned, except what step 4 asks of staff.
2. **A fresh export and zip (Product Owner).** WordPress Admin → Tools → Export → All content, and the
   zip of `wp-content` from the host. Put both in `$STATE`, then:

   ```bash
   sha256sum "$EXPORT" "$ZIP"
   ```

3. **Keep the reviewed list, and merge it (Operator).**

   ```bash
   cp "$STATE/classification-list.csv" "$STATE/classification-list.reviewed.csv"
   node scripts/migration.ts plan "$EXPORT" "$ZIP"
   ```

   `plan` keeps every decision and Summary and appends new items at their defaults. Read its lines
   `Rows added to the earlier list`, `Items no longer in the export`, `Rows still "ต้องเลือก"`,
   `Decisions plan cannot read` and `Announcements without a type`. `No earlier list: every row starts
   at its default` means the reviewed list is not there: stop, put it back from the copy or from
   "Before cutover" step 8, and run `plan` again.
4. **Only published items (Operator).** `inventory.json`'s `items` counts each type by WordPress
   status. Stop while `public-new`, `directive` or `procurement` holds any status but `publish`, such
   as a draft: only published items are migrated. Staff publish or delete it, and steps 2 and 3 run
   again. Read `post` too: an ITA post that is not published is not migrated either, and the Product
   Owner decides.
5. **Review the new rows (Staff, then Operator).** The Operator hands `classification-list.csv` to
   staff over the private channel of "Before cutover" step 8. Staff decide every new row and write the
   Summaries of new items of the current fiscal year, saved as UTF-8 CSV. The Operator puts it back and runs
   step 3's `plan` again: it confirms the list still merges, and `Rows still "ต้องเลือก"` is empty.
6. **The dry run (Operator).** It needs no token and reaches no target:

   ```bash
   node scripts/migration.ts import "$EXPORT" "$ZIP" --dry-run --final
   ```

   Read `Files`, `Items`, `Redirects` and `Notes`. `Items` should match the inventory's published
   counts and the reviewed targets. The export of 2026-11-06 planned 1,001 files with `anom-001.pdf`
   (1,000 without it), 957 media items once identical files are reused, and 490 redirects. A fresh
   export can add rows, 2570's posts (with their folder and `/ita-2570/`), and notes.
7. **The final import (Operator), once.**

   ```bash
   node scripts/migration.ts import "$EXPORT" "$ZIP" --origin "$ORIGIN" --token-file "$TOKEN" --final
   ```

   It stops as "Stops" below says. Then read `import-report.json`: its digests, the counts, the rows at
   their default (none on a final run), and the notes, among them ITA's lines that no block holds and
   any page with no new address.
8. **Verify (Operator).**

   ```bash
   node scripts/migration.ts verify "$EXPORT" "$ZIP" --origin "$ORIGIN" --token-file "$TOKEN"
   ```

   **Read the last line; the exit code is not enough.** It exits 1 on a failure (each one a `FAIL` line),
   and 0 while redirects wait:

   - `VERIFY: PASS` alone: done.
   - `VERIFY: PASS, redirects waiting for a page staff write: N`: the line
     `Redirects waiting for a page staff write` names them. Staff publish those pages, and verify runs
     again until the last line reads `VERIFY: PASS` alone. On the export of 2026-11-06 they are
     `/history/` and `/role/`, both to `/about/organization`.

   The `Pages` line counts pages that answered 200, nothing more. A redirect passes when its destination
   answers 200, so `/office-policy/`, `/officer/` and `/sub-district-health-promoting-hospital/` pass
   on an empty page: check step 5 of "Before cutover" by eye.
9. **Featured (Staff).** Admin → จัดการ → เมนู → "หน้าแรก: เรื่องเด่น (แสดงรายการแรกที่เผยแพร่อยู่)", and
   check the other two "หน้าแรก:" menus (`04` §5, `05` §6).
10. **The DNS switch (Product Owner's go, then DNS holder).** The Product Owner reads verify's report
    and samples the site. The DNS holder changes the domain's record at its provider; the repository has
    no command for it. Then the Operator confirms the public path:

    ```bash
    node scripts/migration.ts verify "$EXPORT" "$ZIP" --origin "<the public HTTPS origin>" --token-file "$TOKEN"
    ```

## Stops

`scripts/migration.ts`'s header is the source. Exit 1, unless the row says otherwise.

| When | What stops it | What to do |
| --- | --- | --- |
| `plan` | an export inside the repository (exit 2); a list it cannot merge, which writes nothing | move the export; repair the list from its copy |
| any import, before writing | a list lacking an item of the export; a row with no default; an order with no file; a slug planned twice | fix the list or tell the Product Owner |
| any import, before writing | an ITA post without exactly one fiscal year tag and one `moit-N` tag; a fiscal year with no Round (other than 2567–2570); a published post with no publish date; a link into the uploads naming no attachment; a link to a page of the site with no new address; a MOIT over 100 blocks | the Product Owner decides: the rule lives in the script, and a change is a commit that goes through its tests and review |
| any import, before writing | a target slug or a legacy redirect that exists; a missing term | a term: run the model-update step. A slug or redirect: find out what wrote it, and restore if it was an earlier run |
| a final import | any row still ต้องเลือก | decide the row |
| during the writes | a write the target refuses | restore the backup of "Before cutover" step 10: the run stopped where it was |

## After cutover

1. **Watch the 404 log (Administrator).** Admin → จัดการ → การเปลี่ยนเส้นทาง → ข้อผิดพลาด 404, daily at
   first. An address people still ask for, with a meaningful successor, gets a redirect there: one hop,
   never a catch-all to the homepage. The log shows neither a direct file address nor `?p=` and
   `?attachment_id=` links (`09` §11).
2. **Revoke the token (Administrator).** Admin → ตั้งค่า → API Tokens, then remove `$TOKEN`:

   ```bash
   rm "$TOKEN"
   ```

3. **Keep the rollback ready (Product Owner, Operator).** The Product Owner sets the window's end.
   WordPress stays up, with its backups, until then.
4. **WordPress's retirement (Product Owner).** `09` §18 keeps it NOT AUTHORIZED. Once it is authorized
   and done, the temporary tooling leaves the repository in one change: `scripts/migration.ts`,
   `scripts/migration/`, `tests/node/migration*`, the leak check in `.githooks/pre-commit`,
   `@emdash-cms/gutenberg-to-portable-text` in `devDependencies`, and the migration's exception in
   `CODING_STANDARDS.md` "Tests".

## Rollback

| Where it went wrong | What to do | Who |
| --- | --- | --- |
| The import stopped before writing | Nothing was written. Fix the cause and repeat from "Cutover" step 6 | Operator |
| The import stopped during its writes, or verify fails, before the DNS switch | Restore the production database and media from "Before cutover" step 10, then repeat from step 6. WordPress is still what the public sees | Operator |
| A problem after the DNS switch | Point the record back at WordPress and tell staff to stop publishing on Songhealth. A restore is needed only to redo the import, and it discards what was written on Songhealth since. WordPress's certificate expired on 2026-10-31, so visitors see a certificate error unless it has been renewed | Product Owner, DNS holder, Operator |

Rollback is practical recovery, not a distributed transaction (`09` §15). The restore command comes
with the backup's (#221).

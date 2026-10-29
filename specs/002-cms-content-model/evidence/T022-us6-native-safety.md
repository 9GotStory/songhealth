# T022 — US6 native safety: T019–T021 serial on the single development runtime

**Status: EXECUTED — all checks passed; awaiting Product Owner acceptance.**
- T019, T020 and T021 ran serially on the single development runtime at
  `http://127.0.0.1:4324`, followed by the focused native Admin UI coverage.
- Results: 13 + 12 + 14 + 3 passed, with 0 failed and 0 skipped. No owned fixture was left
  behind.

This is a Claude Code self-review only (Constitution 5.0.0). It is not independent review.

## Authorization and scope

- **Authorization.** On 2026-10-29 the Product Owner approved the plan proposed in this
  session and delegated its execution: "ให้คุณวางแผนและดำเนินการทั้งหมดแทนฉันได้เลย". The
  plan's decisions were:
  - create the role fixture in the installer;
  - use EmDash's development-only `auth/dev-bypass` session for the Admin UI tests;
  - test SEO as the approved model defines it;
  - keep SC-007 pending until a real staff session takes place.
- **Supersedes the disposable-runtime attempts.** Earlier T022 runs used disposable app
  instances (PR #28; final closeout `f3c30df` on `prep/t022-final-closeout-offline-recovery`:
  NOT PASSED). They ran before the single-runtime rule was enforced and remain history in
  Git. This record is the run on the single runtime that T022 actually specifies.

## Identities

| Item | Value |
| --- | --- |
| Runtime | UID-1000 Quadlet runtime, `http://127.0.0.1:4324` (T036) |
| Run 1 source | `5ade411944a52f9f8d81e16753b9363be97913b5` (runtime and workspace HEAD) |
| Final run source | `f71d56ee8f725e07485d8d2d45273e90424363e9` (runtime and workspace HEAD; verify reports it before and after) |
| Toolchain | Node 24.21.0, Playwright 1.63.0 (chromium), Astro 7.3.5, EmDash 1.1.0, PostgreSQL 18.6 |
| Backups taken by the promotions | `~/.local/state/songhealth-qdev/backups/20261029T022501Z` and `…/20261029T023945Z` |

## What was wrong, and the fixes

1. **The T020 spec lacked the native-expectation fixes from PR #28** (`0c09b5e`, `0c58a93`;
   PR #28 was never merged). Ported into `cms-revisions.spec.ts` (and one comment in
   `cms-lifecycle.spec.ts`):
   - a restore keeps the restore-audit revision as the pending-draft pointer;
   - anonymous requests are refused as `401 NOT_AUTHENTICATED`;
   - a new test checks that a collection without SEO refuses SEO writes.
2. **SEO is off on every collection.** The runtime reports `hasSeo: false` for all ten
   collections, because the approved seed enables SEO nowhere. The live-metadata test wrote
   SEO to `news` and expected success; this setup gap caused the earlier closeout failure.
   - The test now reads `hasSeo` from the native schema. Without SEO it asserts the native
     `400 VALIDATION_ERROR` refusal, and that the refused write left no SEO metadata.
   - The taxonomy and byline current-state checks are unchanged.
   - No schema was changed.
3. **No second native account existed, so the T019/T020 role cases skipped.** EmDash 1.1.0
   has no native way to create one on this runtime:
   - `auth/invite/complete` registers a passkey, and the site URL `http://127.0.0.1:4324`
     makes the WebAuthn rpId an IP literal, which browsers reject;
   - `admin/api-tokens` mints only for the calling Administrator.

   The installer now creates the account once (`ensure_role_fixture`):
   - `role-fixture@songhealth.test`, role Author (30), enabled;
   - the same `users` row shape as EmDash's `dev-bypass`;
   - a `_emdash_api_tokens` row in EmDash's own token format (`ec_pat_` prefix, SHA-256
     base64url hash, the dev-bypass scopes);
   - the raw token goes only into `~/.local/state/songhealth-qdev/role-fixture-pat` (0600).

   It is idempotent: the second installer run reported `role fixture: present`. Verify
   gained check 15: the role fixture PAT authenticates as an enabled Author.
4. **No UI coverage with a logged-in session.** The contract requires UI evidence besides
   the direct APIs (`contracts/native-editorial.md`, "Outcomes and Revision Limits").
   - New file `cms-lifecycle-ui.spec.ts`, opted in with `SONGHEALTH_ADMIN_SESSION=dev-bypass`.
   - The browser signs in through EmDash's development-only `GET /_emdash/api/auth/dev-bypass`
     and logs out through the native logout route after each test. For the existing dev
     admin, that route only sets the session cookie: it inserts nothing, applies no seed and
     mints no token.
   - The journeys it checks:
     - **Publish now:** confirmed in the native "Publish now?" dialog, it publishes a draft,
       and the API reads it back as published.
     - **Lock:** another account's edit lease opens the entry with "Open read-only" and
       "Take over". Read-only mode shows "Songhealth role fixture is editing this entry.
       Nothing you change here will be saved.", and the lease stays with the holder.
     - **Required Document:** a Health Report without one is held by the editor ("Select at
       least one entry."). The URL stays on `/new` and no entry is created.

## Results

Run 1, at `5ade411` (outputs `t022/t019-run-1-output.txt`, `t020-run-1-output.txt`,
`t021-run-1-output.txt`):

| Suite | Result |
| --- | --- |
| T019 `cms-lifecycle.spec.ts` (role fixture supplied) | 13 passed, 0 failed, 0 skipped |
| T020 `cms-revisions.spec.ts` (role fixture supplied) | 12 passed, 0 failed, 0 skipped |
| T021 coordinator | 14 passed, "no owned-fixture residue" |

Final serial run, at `f71d56e` (outputs in `t022/`; verify before and after):

| Step | Output | Result |
| --- | --- | --- |
| verify before | `verify-before.txt` | VERIFY: PASS (15 checks) |
| 1. T019 lifecycle, roles, scheduling | `t019-run-2-output.txt` | 13 passed (includes role phases, disabled account, due-time publication) |
| 2. T020 revisions, locks, metadata | `t020-run-2-output.txt` | 12 passed (includes second-writer lock, SEO boundary) |
| 3. T021 public reads (coordinator) | `t021-run-2-output.txt` | 14 passed, no owned-fixture residue |
| 4. Native Admin UI | `ui-run-1-output.txt` | 3 passed |
| verify after | `verify-after.txt` | VERIFY: PASS |

Commands used, from the workspace at the promoted commit:

```bash
S=~/.local/state/songhealth-qdev
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324 SONGHEALTH_DEV_ACCESS=$S/dev-pat \
SONGHEALTH_ROLE_FIXTURE_ACCESS=$S/role-fixture-pat \
  npx playwright test tests/browser/cms-lifecycle.spec.ts --workers=1 --retries=0   # then cms-revisions
SONGHEALTH_DEV_ACCESS=$S/dev-pat SONGHEALTH_T021_ROUTE_ACCESS=$S/t021-route-access.json \
  node tests/browser/run-cms-public-reads.mjs
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4324 SONGHEALTH_DEV_ACCESS=$S/dev-pat \
SONGHEALTH_ROLE_FIXTURE_ACCESS=$S/role-fixture-pat SONGHEALTH_ADMIN_SESSION=dev-bypass \
  npx playwright test tests/browser/cms-lifecycle-ui.spec.ts --workers=1 --retries=0
```

## Cleanup and residue

Checked after the final run.
- **Fixtures:** every suite's owned-fixture cleanup reported complete. Synthetic entries are
  0 in all ten collections, live and in trash. Media items: 0.
- **Other state:** synthetic taxonomy terms 0, synthetic bylines 0, entry locks 0.
- **Users:** `dev@emdash.local` is Administrator (50) and enabled. `role-fixture@songhealth.test`
  is back to Author (30) and enabled; it is a persistent test account of the runtime, like the
  dev admin.
- **Secrets:** a scan of `t022/` and `t032/` for the three runtime credentials (dev PAT,
  role-fixture PAT, T021 route token) and for `ec_pat_` found 0 occurrences.

## Self-review and limits

- **Typecheck:** `tsc --noEmit` reports the same two errors before and after these changes
  (`tests/node/config.test.ts:173`, `tests/node/foundation.test.ts:304`). These changes
  introduce no new ones.
- **Shell lint:** `bash -n` passes. shellcheck is not installed on this host, so the shell
  changes were reviewed by reading them.
- **Role fixture:** it is written to the database directly, not through an EmDash HTTP API.
  This is a development-runtime-only provisioning step, recorded as such. Production keeps
  the native invite and passkey flow.
- **Dev session:** the UI journeys run as the dev Administrator. They do not prove role-specific
  UI (for example, the Contributor's missing Publish control); the direct API suites cover
  roles.
- **Not exercised in the UI:** scheduling from the Admin UI. Scheduling is covered through
  the API, including real due-time publication in T019.
- **Deferred guarantees stay deferred:** D-ITA/D-REF; the read-time reference availability
  test in T021 confirms D-REF remains deferred.

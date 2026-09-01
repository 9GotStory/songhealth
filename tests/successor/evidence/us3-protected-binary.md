# US3 Protected Binary Evidence — Delivery 002 Gate 05 (T039–T047)

Quickstart section 6 evidence for User Story 3 (tasks.md T047). Recorded by the
DEV Executor against the exact candidate worktree; independent review and task
completion are Codex/Human owned.

- **Base:** `fc7e8deacaff49816ea4217220464e1e35938b86` (`002-headless-wordpress-foundation`, the persisted Gate 04 state)
- **Candidate:** uncommitted working tree on branch `agent/claude-developer/g05`
  (checkout of the base commit plus this batch; no commit made — persistence is
  the Gate's post-PASS step)
- **Changed/new files:** see `## Scope` below
- **Environment profile (disposable local verification only):** WordPress 7.1 /
  PHP 8.3.33 / MySQL 8.4 (the digest-pinned Gate 01.5 verification images),
  PHPUnit 9.6.36 + wp-phpunit, Node 24.11.0 / npm 11.6.1, Vitest 4.1.10,
  Playwright 1.62.1 (Chromium). Browser and live-HTTP runs used the live
  runtime at a loopback origin with the React application served by the
  repository's dev runner and the plugin bind-mounted read-only from this
  checkout. No Production parity claim; the Production storage realization
  remains the US4 evidence gate by authorization.

Evidence omits secrets, cookies, nonces, complete grants, CMS usernames,
paths beyond the committed examples, SQL, protected file content, and stored
filenames.

## 1. Test-first evidence (T039–T041 written before T042–T046)

| Suite (task) | Pre-implementation observation |
| --- | --- |
| `ProtectedBinaryContractTest` (T039, integration) | 10 errors — every case errored on `Class "SonghealthCore\Binary\ProtectedAttachment" not found` while the pre-controller binary handler answered the neutral class; the documented expected red, not fixture failures. |
| `ProtectedBinaryBypassTest` (T040, containment) | Same missing-class error shape before T042 existed. |
| `protected-document.spec.ts` (T041, browser) | The React application had no `/documents` route and the binary surfaces answered the neutral class, so every delivery/routing case failed on those missing behaviors, not on fixtures. |

## 2. Quickstart §6 — upload/non-public, publication, delivery, revocation (T039, T042–T044)

PHPUnit integration suite (fresh disposable `wordpress_test` database per
suite; one-shot container in the pinned wordpress:cli image with the pinned
WordPress 7.1 core as `ABSPATH`):

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite integration --filter ProtectedBinaryContractTest
OK (11 tests, 161 assertions)
```

Recorded behavior:

- **Upload/non-public state:** `ProtectedAttachment::attach()` moves real
  bytes into the server-denied protected directory (random stored name, upload
  filename never retained, no standard-upload copy left behind, mode
  normalized so the web-server user can read for mediated delivery only). A
  Draft/private/pending/scheduled/withdrawn/hidden-visibility document never
  delivers; unsafe content is refused at attach whatever label it declares
  (content inspection decides); oversized input is refused; a non-Document or
  unaccepted target is refused.
- **Publication:** the publish transition makes the same URL deliver through
  the owning Document Resource's own current eligibility — identity →
  eligibility → relationship/metadata → bytes, in that order.
- **Anonymous delivery:** an eligible document delivers its exact stored bytes
  with the validated content type, a title-derived attachment disposition,
  `nosniff`, exact `Content-Length`, and `private, no-store`.
- **Revocation/retained URL:** withdraw → the retained prior-success URL
  denies on the NEXT request with the one neutral class; restored eligibility
  restores delivery; returning to Draft revokes again. A previously
  successful delivery never authorizes a later request.
- **Reference non-elevation:** an eligible public Basic Page referencing a
  Draft and a withdrawn document leaves both neutral on their binary paths.
- **Broken relationship:** the attachment record disappearing or the stored
  file disappearing breaks publication validity (ineligible + neutral).
- **Unsafe metadata/type:** refused at attach (`unsafe_type`), and a tampered
  meta reference (self-reference, borrowed attachment from another document)
  is never publication-valid and never delivers; the true owner keeps
  delivering.
- **One-to-one:** replacement removes the previous attachment record and
  file; exactly one live relationship remains and the current file is the
  delivered file.
- **Ranges:** a satisfiable single range serves the exact slice (206 with
  `Content-Range` and slice `Content-Length`); open-ended and final-byte
  ranges serve correctly; an unsatisfiable start is refused with no bytes
  (416, `bytes */size`); malformed, suffix, and multi-range requests degrade
  to the bounded full response.
- **Neutral equivalence:** unknown, malformed, uppercase, and every ineligible
  condition share one observable contract — status, body, and headers
  identical to the unknown-record reference.
- **Nondisclosure:** no denial or delivery discloses the upload filename, the
  stored basename, the storage directory, the attachment ID, or an uploads
  path.
- **Preview binary separation (T044):** the candidate bytes of an INELIGIBLE
  Draft reach an authorized staff session through the Preview binary surface
  (staff session → exact-origin → presented-nonce → grant binding → fresh
  view-capability decision → validated relationship → bytes, with Preview
  confidentiality headers); the same request anonymously is the neutral
  denial; demotion denies the next Preview binary request; the anonymous
  surface stays neutral for the same record throughout.

## 3. Quickstart §6 — containment (T040)

```text
$ cd wordpress && composer test:containment            # without live-probe env
OK, but incomplete, skipped, or risky tests! (24 tests, 232 assertions, 2 skipped)
$ SONGHEALTH_BINARY_PROBE_ORIGIN=<runtime origin> SONGHEALTH_BINARY_PROBE_FILE=<seeded file> \
  SONGHEALTH_BINARY_PROBE_PUBLIC_ID=<seeded eligible id> composer test:containment
OK (24 tests, 246 assertions)                          # live probes included, no skips
```

Recorded behavior (the second run joins the runtime's network and probes its
real Apache; the first keeps the live cases explicitly skipped with recorded
reasons):

- The mediated route is the only Songhealth delivery shape; no media or
  attachment surface exists in the namespace.
- The raw protected-file URL is denied at the server layer for plain,
  URL-encoded, double-encoded, traversal-shaped, slash-prefixed, and
  dot-segment variants; the directory listing is denied too (`Require all
  denied`, verified as `client denied by server configuration` in the runtime
  log).
- The native media REST item and collection are contained anonymously over
  HTTP; redirect-following cannot launder a contained surface into bytes.
- The mediated URL delivers for the currently eligible runtime fixture; a
  malformed identifier is the same neutral class over HTTP.
- At the WordPress layer: the native attachment route/page resolves nothing
  public; `wp_get_attachment_url()` for a protected attachment returns no URL
  at all (the storage path never reaches any URL-shaped output); the upload
  filename is retained neither on disk nor as searchable identity; the
  standard upload location holds no copy. Authenticated editor media
  infrastructure is untouched (only the URL disclosure seam is contained).

## 4. Browser evidence (T041, T045–T046)

Against the live full stack — synthetic staff identity, seeded eligible and
Draft fixtures created through the accepted creation service and
`ProtectedAttachment::attach`, the documented wp-cli control for mid-test
revocation:

```text
$ npx playwright test tests/e2e/protected-document.spec.ts
  8 passed (8.0s)
```

Recorded behavior: the canonical `/documents/{publicId}/{slug}` route renders
the eligible record with exactly one canonical link; the only download target
is the absolute mediated Songhealth binary path (no uploads URL, attachment
id, or media REST shape in the document); missing and outdated slugs redirect
directly to the canonical path; the anonymous download delivers
`application/pdf` bytes with `no-store` and a non-upload disposition; the
wp-cli revocation denies the retained prior-success URL and the public route
on the next request and restores after cleanup; an ineligible referenced
document is neutral on its route and binary path with no state disclosure; no
public `/documents` hub exists; the authenticated Preview binary delivers to
the bound staff session with Preview confidentiality while the anonymous
binary path stays neutral for the same record, and an anonymous direct
Preview-binary request with a leaked grant is the neutral denial.

## 5. Regressions (accepted T001–T038 behavior preserved)

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite integration
OK (65 tests, 1118 assertions)
$ cd wordpress && php vendor/bin/phpunit --testsuite unit
OK (73 tests, 954 assertions)
$ cd apps/web && npx vitest run --project contract
      Tests  22 passed (22)
$ cd apps/web && npx vitest run --project unit app/routes/foundation.test.tsx
      Tests  9 passed (9)
$ npx tsc -p tsconfig.json --noEmit   → clean
$ npm run build:web                   → react-router build ✓ (client + ssr) and tsc server.ts entry ✓
$ npx playwright test tests/e2e/public-foundation.spec.ts   # US1 regression
  10 passed (3.2s)
$ npx playwright test tests/e2e/staff-preview.spec.ts       # US2 regression
  12 passed (2.7m)
$ scripts/wordpress-verification.sh ready
ready: WordPress serving, songhealth-core loaded and the only active plugin
$ php -l <each changed PHP file>      → no syntax errors
$ git diff --check                    → clean
```

Accepted tests updated to the strengthened boundary — fixture re-pinning only,
no assertion weakened, deleted, skipped, or substituted:

- `PublicEligibility`'s document publication validity now delegates to the
  T042 relationship (a raw Media Library row alone no longer publishes a
  document — the persisted US3 rule "delivery requires its current
  eligibility and a valid safe attachment"). The four fixture builders across
  `PublicProjectorTest`, `PublicEligibilityTest`,
  `EligibleResourceQueryTest`, and `PublicRestContractTest` now establish
  fixtures through `ProtectedAttachment::attach()`; every eligibility,
  projection, and contract assertion is unchanged.
- The route inventories grew by the authorized Preview binary shape:
  `RoutesTest` expects the five approved shapes,
  `PluginLifecycleWiringTest` the six namespace entries (including the
  namespace index WordPress itself registers).
- `PreviewController`'s staff-session, exact-origin, and presented-nonce
  gates moved from private to public so the T044 surface re-uses them
  verbatim; no logic changed.

## 6. Security/privacy notes

- Storage existence is never delivery authority: the direct file URL is
  denied at the server layer, the WordPress attachment-URL seam discloses
  nothing, and every anonymous request re-decides the owning Document
  Resource's eligibility, relationship, and metadata live.
- No Media Library URL, attachment ID, filesystem path, or filename is ever a
  public identity; stored names are random; dispositions derive from the
  document title.
- Preview binary authorization is the accepted Gate 04 stack re-used verbatim
  (session + exact-origin + presented-nonce + bound grant + fresh
  capability), consults no eligibility, and changes no anonymous behavior.
- All denials are the one bounded neutral class; deliveries carry
  `private, no-store` and `nosniff`; no evidence here carries protected file
  content, credentials, nonces, grants, storage paths, or user identity.

## 7. Environment limits and notes (none weakening a required proof)

- The live HTTP containment probes are env-gated
  (`SONGHEALTH_BINARY_PROBE_ORIGIN/FILE/PUBLIC_ID`); they ran fully in the
  live verification run (24 tests, 246 assertions, no skips) and skip with
  recorded reasons when a live runtime is not supplied to the suite.
- The protected-storage server denial is the verification runtime's Apache
  (`.htaccess` `Require all denied`); the Production storage realization
  (out-of-docroot vs. denied location on the real Bangmod account) remains
  the US4 evidence gate, as the authorization's Production-storage boundary
  requires.
- The runtime fix found during live verification: the move out of the
  temporary upload preserves its 0600 mode, which left the bytes unreadable
  to the web-server user; `attach()` now normalizes the mode (0644) so the
  mediated route can read for delivery while the server denial owns direct
  access.
- ESLint remains not runnable (its config imports devDependencies of later
  task scope — same non-blocking note as Gates 03/04); npm 11.6.1 remains
  below the `npm >=12 <13` engine pin; the Delivery 001
  `apps/web/server.test.ts` suite was not run this batch (recorded as
  pre-existing on the pristine base at Gate 03).

## 8. Scope

Modified tracked files (12): `songhealth-core.php` (module list + doc
entries), `src/Eligibility/PublicEligibility.php` (document publication
validity delegates to the T042 relationship), `src/Plugin.php` (wires the
binary controllers and the attachment-URL containment), `src/Preview/PreviewController.php`
(three gates promoted to public for T044 verbatim reuse), `src/Rest/Routes.php`
(registers the Preview binary shape; dispatches the anonymous binary route),
`tests/integration/PluginLifecycleWiringTest.php` and
`tests/unit/RoutesTest.php` (authorized route-inventory growth),
`tests/integration/PublicRestContractTest.php`,
`tests/unit/PublicProjectorTest.php`, `tests/unit/PublicEligibilityTest.php`,
`tests/unit/EligibleResourceQueryTest.php` (fixtures through the accepted
relationship), `apps/web/app/routes.ts` (the two `/documents` path shapes;
no hub).

New files (9): `src/Binary/ProtectedAttachment.php` (T042),
`src/Binary/BinaryController.php` (T043), `src/Binary/PreviewBinaryController.php`
(T044), `tests/integration/ProtectedBinaryContractTest.php` (T039),
`wordpress/tests/containment/ProtectedBinaryBypassTest.php` (T040),
`apps/web/tests/e2e/protected-document.spec.ts` (T041),
`apps/web/app/components/DocumentResource.tsx` (T045),
`apps/web/app/routes/documents.$publicId.$slug.tsx` (T046), and this
evidence file (T047).

Out of scope and absent: T048–T060 and all US4 work, finished
document-management Product workflows, generic media-library replacement
infrastructure, public Songhealth search, `/pages` or `/documents` listing
hubs, another eligibility authority, raw Media identity/URLs, dependency
expansion, Production storage assumptions or infrastructure, Delivery 001
deletion or retirement, and deploy/import/migrate/Trial Migration/Production
Import/cutover work.

## 9. Corrective round — G05-B01–B02 (Human rework authorization)

Applied to the same uncommitted candidate; base unchanged. Files changed
relative to the reviewed candidate: `src/Binary/BinaryController.php` (B01),
`src/Binary/ProtectedAttachment.php` (B02),
`tests/integration/ProtectedBinaryContractTest.php` (both focused regression
sets), and this evidence file.

- **B01 (reversed and boundary byte ranges):** the range parser establishes
  every numerical invariant before any partial shape exists. An explicit end
  below the start — reversed adjacent (`bytes=10-9`) or clearly reversed
  (`bytes=10-5`) — joins the existing bounded malformed class (full
  response), and an end-clipping/length guard makes a negative length or an
  out-of-bounds slice unconstructible. Valid behavior is unchanged: equal
  endpoints, first/final byte, open-ended, clipped, and whole-file ranges
  serve exact slices with valid `Content-Range`/`Content-Length`;
  start at/after the boundary refuses with no bytes (416). Range support is
  not broadened.
- **B02 (verified direct-access denial):** `ensure_protection()` never treats
  an existing or readable control file as proof. The exact expected control
  is verified byte for byte: missing → safely installed; exact → accepted
  unchanged; empty/malformed/incomplete/stale → safely reconciled by
  rewriting the exact control; the written state is re-read and verified
  after any write. An unreadable control (unverifiable) or a mismatched
  control that cannot be rewritten (unwritable pre-existing) fails closed,
  and `attach()` accepts protected bytes only after the verified denial is
  in place (the refused upload is left unstored with no attachment
  reference). The mechanism stays the local Apache denial of the authorized
  verification environment; the Production storage realization remains the
  US4 evidence gate.

Focused corrective verification (same environment and discipline):

```text
$ php vendor/bin/phpunit --testsuite integration --filter test_b01
OK (4 tests, 130 assertions)          # reversed/adjacent/equal/ascending/clipping/final/boundary + empty-upload refusal
$ php vendor/bin/phpunit --testsuite integration --filter test_b02
OK (9 tests, 63 assertions)           # includes the 3 protection-state cases (missing/exact/idempotent/empty/malformed/stale/unreadable/occupied/uncorrectable + attach-after-verified)
```

Post-correction full verification:

```text
$ php vendor/bin/phpunit --testsuite integration
OK (69 tests, 1224 assertions)
$ php vendor/bin/phpunit --testsuite unit
OK (73 tests, 954 assertions)
$ composer test:containment   (live probe env: runtime origin + seeded file + seeded public id)
OK (24 tests, 246 assertions)          # live Apache direct-access denial reproduced, no skips
$ composer test:containment   (without live env)
OK (24 tests, 232 assertions, 2 explicit env-gated skips)
$ npx playwright test tests/e2e/protected-document.spec.ts
  8 passed
$ npx playwright test tests/e2e/public-foundation.spec.ts
  10 passed
$ npx playwright test tests/e2e/staff-preview.spec.ts
  12 passed
$ npx vitest run --project contract → 22 passed
$ npx vitest run --project unit app/routes/foundation.test.tsx → 9 passed
$ npx tsc -p tsconfig.json --noEmit → clean
$ npm run build:web → ✓
$ php -l <changed PHP files> → no syntax errors
$ scripts/wordpress-verification.sh ready → ready
$ git diff --check → clean
```

No accepted test was weakened, deleted, skipped, or substituted; the earlier
recorded sections above remain the record of the first round against the
pre-correction candidate.

# US1 Public Contract Evidence — Delivery 002 Gate 03 (T020–T029)

Quickstart sections 2–4 evidence for User Story 1 (tasks.md T029). Recorded by
the DEV Executor against the exact candidate worktree; independent review and
task completion are Codex/Human owned.

- **Base:** `a8b69ec250e073b91761ab3a3694970896b57218` (`002-headless-wordpress-foundation`)
- **Candidate:** uncommitted working tree on branch `agent/claude-developer/7ba257f09a57`
  (checkout of the base commit plus this batch; no commit made — persistence is
  the Gate's post-PASS step)
- **Changed/new files:** see `## Scope` below
- **Environment profile (disposable local verification only):** WordPress 7.1 /
  PHP 8.3.33 / MySQL 8.4 (the digest-pinned Gate 01.5 verification images),
  PHPUnit 9.6.36 + wp-phpunit 7.1.0, Node 24.11.0 / npm 11.6.1, Vitest 4.1.10,
  Playwright 1.62.1 (Chromium headless shell 151). No Production parity claim.

## 1. Test-first evidence (tests written before T025–T028)

The five verification definitions were authored and run against the base
commit's fail-closed handlers before any US1 implementation existed; the
implementation files were then temporarily set aside once more at the end and
the expected-red state re-captured, so both rounds are recorded.

| Suite (task) | Pre-implementation observation |
| --- | --- |
| `PublicIdRegistryTest` (T020, unit) | Pins the accepted T011/T012 behavior; 72-test unit suite green on the base. One case corrected during authoring (`is_public_id_shape` is a shape bound, not identity validation — see `## Notes`). |
| `PublicRestContractTest` (T021, integration) | 8 failures + 2 errors: every live detail/listing case received the pre-controller neutral 404 (`Failed asserting that 404 is identical to 200`), and the two envelope cases hit `Undefined array key "hasMore"/"nextCursor"`. 20 tests: 10 pre-existing wiring tests passed. |
| `PublicSurfaceContainmentTest` (T022, containment) | Matrix passes against the accepted T018 containment (19 tests total in the suite); two over-strict authoring cases corrected against the accepted control semantics (see `## Notes`). |
| `songhealth-public-contract.test.ts` (T023) | `Error: Cannot find module '../../app/services/songhealth-public'` — the single intentional module-resolution failure; `Tests: no tests`. |
| `public-foundation.spec.ts` (T024, browser) | Could not run pre-implementation (no `/pages` routes existed); the live run below is the post-implementation proof. |

## 2. Quickstart §2 — Public ID and canonical detail (T020, T025)

PHPUnit unit suite (fresh disposable database per suite):

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite unit
OK (72 tests, 917 assertions)
```

Recorded behavior:

- Draft-time issuance: creation as Draft through the Songhealth creation
  service returns success only with a canonical UUIDv7 (version/variant bits
  asserted) and a one-to-one mapping verified in both directions from outside
  the service; `is_accepted()` true; the Draft is identity-bearing but not
  publicly eligible.
- Immutability: title change, slug change, lifecycle change, and visibility
  change leave the issued Public ID and registry row byte-identical; ordinary
  WordPress update paths are untouched.
- Collision/non-reissue: both registry unique keys refuse duplicates; `assign()`
  refuses a resource holding a live or tombstoned mapping; a deleted record's
  identifier is retained (tombstone row) and never reassigned to a successor.
- Creation-service failure semantics: registry-unavailable returns
  `issuance_unavailable` with **no** record written; a forced in-flight
  issuance failure (resource key claimed inside the bounded transaction)
  returns a bounded service failure with no surviving record, mapping, or
  accepted resource.
- Quarantine: a raw Core insert of a supported type remains an identityless
  internal candidate — never accepted, never eligible, never resolvable, and
  not launderable through the service (`update_not_supported`).

## 3. Quickstart §3 — Detail and leakage-safe bounded listing (T021, T025)

PHPUnit integration suite through the live REST server:

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite integration
OK (20 tests, 479 assertions)
```

Recorded behavior:

- Detail allowlist: the Basic Page DTO is exactly
  `type, publicId, title, canonicalPath, summary, body, documentReferences`;
  the Document Resource DTO is exactly
  `type, publicId, title, canonicalPath, documentDate, downloadPath`.
  Sentinel meta values, CMS user identity, internal post IDs (whole-value
  walk), internal post-type names, lifecycle values, media filenames, and
  ineligible reference identifiers never appear.
- Neutral equivalence: malformed, uppercase, non-v7, unknown, wrong-type,
  Draft, private, scheduled, hidden, internal-visibility, withdrawn,
  untitled-published, tombstoned, and identityless-identifier conditions all
  produce one identical observable contract (404, fixed body, `no-store`,
  `nosniff`, no Location, no fixture title or Public ID in the body).
- Bounded listing: exact envelope shapes (continuing
  `{data, hasMore, nextCursor}` / terminal `{data, hasMore}`, cursor key
  omitted entirely when terminal); at most `perPage` items; deterministic
  newest/oldest Public-ID keyset walks covering each eligible record exactly
  once; type-scoped; every returned item re-verified against
  `PublicEligibility` through the shared resolution path; revocation between
  pages suppresses the record on the next page.
- Hard budget: with 205 phantom live candidates against a budget of 200, the
  first page returns `data: []` (key present), `hasMore: true`, and an opaque
  cursor — the empty all-ineligible continuation window — and the next page
  returns the 3 eligible fixtures and terminates.
- Cursor contract: no type/order/Public-ID/field-name leakage in the token;
  tampered, truncated, byte-flipped, appended, padded, non-canonical,
  type-mismatched, order-mismatched, expired, and wrong-version cursors all
  share the single bounded invalid-request body.
- Totals/search: no `total`/`totalPages`/`page`/`perPage` keys, no
  `X-WP-Total*` collection headers, search-like parameters (`s`, `search`,
  `include`, `orderby`, `page`) have no effect on the response, and no
  Songhealth search route or declared search argument exists.

## 4. Quickstart §4 — Native-surface containment (T022)

```text
$ cd wordpress && composer test:containment
OK (19 tests, 201 assertions)
```

Anonymous native-surface matrix recorded: REST namespaces and query-shaped
probes (posts/pages/media/users/search/types/taxonomies/categories/tags/
comments/oEmbed) all contained with the neutral class and no fixture
disclosure; single/direct routes by `p`/`page_id`/`pagename`/`name` (plus
encoded variants) resolve to the neutral 404 with empty query results;
search/archive/taxonomy/tag/author/date surfaces and all four feed shapes
(rss2/atom/rdf/comments-rss2) never list the supported types or their records;
sitemaps exclude the types and carry no record identity; attachment and
Document Resource direct routes and native media REST disclose no media
identity; native permalink/shortlink/REST-link metadata cannot compete with
the React canonical route (the record's WordPress permalink 404s while the
DTO's `/pages/{publicId}/{slug}` path is the one canonical destination);
authenticated staff keep full native REST, the operational index, and ordinary
wp-admin/internal query behavior.

## 5. Frontend contract and browser evidence (T023, T024, T026–T028)

```text
$ cd apps/web && npx vitest run --project contract
      Tests  18 passed (18)
$ cd apps/web && npx vitest run --project unit app/routes/foundation.test.tsx   # T017/T024 regression
      Tests  9 passed (9)
```

Browser suite against the live full stack (WordPress verification runtime at
`127.0.0.1:18090`, `songhealth-core` the only active plugin, eligible + Draft
fixtures seeded through the creation service; app served by
`react-router dev --port 4173` with `SONGHEALTH_API_BASE_URL`):

```text
$ SONGHEALTH_WEB_ORIGIN=http://localhost:4173 SONGHEALTH_API_BASE_URL=… \
$   SONGHEALTH_E2E_INELIGIBLE_PUBLIC_ID=<draft fixture> npx playwright test
  10 passed (3.7s)
```

Recorded browser behavior: eligible record renders by Public ID with no
CMS-internal fields in the document; exactly one `rel="canonical"` equal to
the canonical path; missing, outdated, and differently-normalized slugs each
302-redirect directly to the canonical path and land there in the browser;
malformed and unknown canonical identifiers get the neutral 404 with no
homepage redirect; a known-ineligible (Draft) identifier is neutral with no
existence/lifecycle disclosure; `/pages` (no hub) and `/search` are 404; no
search request is ever issued from the public surface. The spec discovers its
eligible fixture through the approved bounded listing itself.

## 6. Build, typecheck, lint, whitespace

```text
$ npm run build:web        → react-router build ✓ (client + ssr) and tsc server.ts entry ✓
$ npx tsc -p tsconfig.json --noEmit   → clean (0 errors, repo-wide)
$ git diff --check         → clean (before and after the .gitignore line)
$ npx eslint <changed files>          → NOT RUNNABLE (environment/scope limit)
```

ESLint limitation: `eslint.config.js` imports `@eslint/js`,
`typescript-eslint`, and `globals`, which are devDependencies of later task
scope and intentionally absent from `package.json` (the config header states
"ESLint is not installed before then"). Installing them would be a speculative
dependency/lockfile change outside this batch, so lint is recorded as not
runnable here rather than worked around. TypeScript checking of every changed
frontend module and the repo-wide project typecheck are clean.

## 7. Environment limits and skips (all non-blocking, none weakening)

- `apps/web` `server.test.ts` (Delivery 001 SSR handoff suite): 13 failed /
  1 passed — **identical on the pristine base commit** (verified by running it
  on a clean worktree of `a8b69ec`); the failing import is the Delivery 001
  `@songhealth/server/http` workspace build, which this batch neither touches
  nor builds. Not a regression; recorded as pre-existing.
- ESLint: not runnable (see §6).
- npm 11.6.1 is below the repository's `npm >=12 <13` engine pin (same
  non-blocking note as previous gates); Node 24.11.0 satisfies `node >=24 <25`.
- PHP/MySQL suites run in the digest-pinned Gate 01.5 container images with a
  fresh disposable `wordpress_test` database per suite (the documented
  profile discipline); WordPress core 7.1 / wp-phpunit 7.1.0 / PHP 8.3.33.
- The verification runtime had pretty permalinks flushed (`wp rewrite
  structure … --hard`) so `/wp-json/…` serves directly; synthetic data only.

## 8. Scope

New files (10): `PublicResourcesController.php` (T025),
`PublicIdRegistryTest.php` (T020), `PublicRestContractTest.php` (T021),
`PublicSurfaceContainmentTest.php` (T022), `songhealth-public.ts` (T026),
`BasicPage.tsx` (T027), `pages.$publicId.$slug.tsx` (T028),
`songhealth-public-contract.test.ts` (T023), `public-foundation.spec.ts`
(T024), and this evidence file (T029).

Modified tracked files (5): `songhealth-core.php` (module list + comment),
`Routes.php` (detail/listing handlers dispatch to the T025 controller; Preview
and binary handlers unchanged and still fail closed pending T035/T043),
`RoutesTest.php` (three cases whose own comments pinned the explicit
pre-T025 "fails closed until the US1 controller exists" state re-pinned to the
live controller; validation-boundary assertions unchanged),
`apps/web/app/routes.ts` (registers the two `/pages/:publicId[/:slug]` path
shapes mapped to the one T028 module; no `/pages` index), and `.gitignore`
(one entry for the React Router generated `apps/web/.react-router/` state).

Out of scope and absent: T030+, Preview/binary controllers, importer,
migration, cutover, deployment, retirement work, public search, a `/pages`
hub, raw WordPress or Delivery 001 fallback in the client, exact listing
totals, deep OFFSET, a second eligibility authority, new dependencies, and
governance/status artifacts.

## 9. Security/privacy notes

- The controller owns no eligibility rule or projection field; both come from
  the accepted T013/T015/T017 primitives, and the projector re-evaluates the
  live decision per item at projection time.
- All public responses of the batch (200 and neutral classes, and the React
  route's redirect) are `Cache-Control: no-store` — cache is never
  eligibility authority.
- The React client is loader/server-side: the API base is read from the server
  environment (`SONGHEALTH_API_BASE_URL`), never from a `VITE_`-prefixed
  browser value; no credential is attached; exactly one request to exactly
  one backend per operation (no fallback chain).
- The Basic Page body is rendered through a client-side tag allowlist parser
  into React elements; no `dangerouslySetInnerHTML` exists in the component,
  so contract markup can never reach the document as raw HTML.
- No secrets, cookies, nonces, CMS usernames, paths beyond the committed
  example, SQL, or protected content appear in any recorded evidence above;
  fixture identifiers shown are synthetic disposable-profile Public IDs.

## 10. Notes / deviations

- Two authoring corrections during the test-first phase, both fixing the TEST
  to the accepted authority rather than changing accepted behavior:
  `FoundationTypes::is_public_id_shape()` is a metadata *shape* bound
  (case-normalizing, any UUID version) — strict identity validation remains
  the registry's, as asserted alongside; and the containment matrix asserts
  the accepted T018 semantics for a supported-type archive query (stripped by
  the containment layer, degrading to the ordinary front-end query) rather
  than a 404, and treats an unknown pretty path under plain permalinks as
  generic WordPress behavior (no disclosure) rather than a Songhealth
  containment claim.
- `documentReferences` rendering links under `/documents/{publicId}` uses the
  Frozen canonical base; resolution of that base is US3 (T046) and is
  deliberately not implemented here, so those links are neutral-404 until
  US3 is authorized. No `/documents` route was added.

## 11. Corrective round — G03-B01 / G03-B02 (Human-authorized)

Against the same reviewed uncommitted worktree (`agent/claude-developer/7ba257f09a57`,
HEAD unchanged at `a8b69ec…`), with no other behavior touched:

- **G03-B01 (cursor convergence):** the route-boundary cursor argument now
  accepts any string value, so emptiness, the 512-character maximum, canonical
  form, authenticity, expiry, and type/order/version binding are all owned by
  the existing Songhealth cursor/query path
  (`EligibleResourceQuery::validate_params`/`validate_cursor` → the persisted
  neutral class). The maximum-size bound is retained unchanged and still fails
  closed. New focused transport regression
  (`RoutesTest::test_every_invalid_cursor_condition_converges_on_the_songhealth_invalid_request_contract`)
  proves the full observable response — status, code, body, `no-store`,
  `nosniff` — is one identical `songhealth_invalid_request` contract across
  empty, overlength, at-the-512-boundary, malformed, padded, whitespace-led,
  tampered, truncated, and appended cursors, with the exact issued token as
  the observably distinct 200 control and no platform `rest_invalid_param`
  body anywhere; the empty and overlength conditions were also added to the
  T021 integration cursor matrix.
- **G03-B02 (request-bound frontend decoding):** `getResourceDetail()`
  requires the decoded DTO `type` and `publicId` to equal the requested
  values, and `listResources()` requires every decoded item to carry the
  requested `params.type`; any mismatch is the existing contract-violation
  rejection — no fallback, no canonicalization, no coercion, exactly one
  request. Four T023 regressions added (mismatched detail Public ID,
  mismatched detail type, cross-type list item, matching responses still
  succeed).
- Evidence count corrected (New files: 10); the T024 pre-implementation
  browser limitation statement stands as originally recorded — no
  pre-implementation browser run was captured, and none is implied.

Corrective verification (same disposable profile, fresh database per suite):
`phpunit --testsuite unit` **OK (73 tests, 944 assertions)** ·
`phpunit --testsuite integration` **OK (20 tests, 481 assertions)** ·
`composer test:containment` **OK (19 tests, 201 assertions)** ·
frontend contract (incl. the four B02 regressions) **22 passed** ·
foundation route regression **9 passed** · `npx tsc -p tsconfig.json
--noEmit` clean · `npm run build:web` ✓ · canonical-route browser regression
on the live stack **10 passed** · `git diff --check` clean. ESLint remains
not runnable for the scope reason recorded in §6, and the pre-existing
`server.test.ts` baseline of §7 is unchanged.

# Delivery 002 Final Acceptance Matrix — Gate 07 Corrective Rework (T057)

FR-024/FR-025 risk-category matrix, the reconciled FR-031 reference boundary,
and SC-001–SC-011 disposition across the accepted PHP unit/integration, REST
contract, containment, frontend contract, and browser suites (tasks.md T057,
regenerated for the G07-B01–B02 corrective candidate). Recorded by the DEV
Executor against the exact candidate worktree; independent review and task
acceptance are Codex/Human owned.

- **Canonical FR-031 authority:** `c51ee2b6a3406ac9a5ff20927ff733e5bef9f014`
  (`spec: bound Delivery 002 reference projection`)
- **Routing base:** `25df579963cdd4df6e0ec64360ec3dcaf53c30e1` (sole child of
  `c51ee2b6…`; `Authorization state: REWORK`, G07-B01–B02)
- **Candidate:** this batch's tree on branch `agent/claude-developer/g07r1`
  (see the CORRECTIVE_RESULT for the exact SHA). The rejected candidate
  `aedda25d…` was not used as a base and is not in this candidate's ancestry.
- **Environment profile (disposable local verification only):** WordPress
  7.1 core / PHP 8.3.33 / MySQL 8.4 (the digest-pinned Gate 01.5 verification
  images), PHPUnit 9.6.36 + wp-phpunit 7.1.0, Node 24.11.0 / npm 11.6.1,
  Vitest 4.1.10, TypeScript 5.9.3, Vite 8.2.1, Playwright 1.62 (Chromium).
  One-shot `wordpress:cli` container per suite invocation running as the
  profile's `www-data` user (`--user 33:33`, `--do-not-cache-result`), with a
  fresh disposable `wordpress_test` database created immediately before each
  invocation; live HTTP/browser work against the loopback verification
  runtime (`songhealth-core` the only active plugin) and the React app served
  locally. No Production parity claim and no Bangmod account access (§4).

Evidence omits secrets, cookies, nonces, complete grants, CMS usernames,
paths beyond the committed examples, SQL, protected file content, and stored
filenames. Continuation cursors are recorded only as opaque values.

## 1. Final verification sweep (exact commands and results)

```text
$ scripts/wordpress-verification.sh ready
ready: WordPress serving, songhealth-core loaded and the only active plugin

$ cd wordpress && php vendor/bin/phpunit --testsuite unit            # +3 FR-031 tests
OK (76 tests, 1278 assertions)
$ php vendor/bin/phpunit --testsuite integration                     # +6 FR-031 tests
OK (96 tests, 1657 assertions)
$ php vendor/bin/phpunit --bootstrap tests/containment/bootstrap.php tests/containment
OK, but incomplete, skipped, or risky tests!
Tests: 24, Assertions: 240, Skipped: 2.          # documented no-probe mode
$ SONGHEALTH_BINARY_PROBE_ORIGIN=… SONGHEALTH_BINARY_PROBE_FILE=… \
  SONGHEALTH_BINARY_PROBE_PUBLIC_ID=… \
  php vendor/bin/phpunit --bootstrap tests/containment/bootstrap.php tests/containment
OK (24 tests, 254 assertions)                    # live-probe mode, no skips

$ cd apps/web && npx vitest run --project contract
Tests  22 passed (22)
$ npx vitest run --project unit app/routes/foundation.test.tsx
Tests  9 passed (9)
$ cd <repo root> && npx tsc -p tsconfig.json --noEmit   → clean (0 errors)
$ npm run build:web               → react-router build ✓ (client + ssr) and tsc server.ts entry ✓

$ npx playwright test tests/e2e    # all three browser suites, live full stack
  30 passed (2.7m)                 # 10 public-foundation + 12 staff-preview + 8 protected-document

$ php -l <each of the 12 changed PHP files>  → no syntax errors
$ git diff --check                 → clean
```

Regression baselines: unit 73→76 and integration 90→96 reflect exactly the
new FR-031 tests (3 unit + 6 integration); every pre-existing count and the
containment, frontend, and browser results are unchanged from the accepted
Gate 01–06 records. No accepted assertion was weakened, deleted, skipped, or
substituted; the full pre-change suite is part of every run above.

Browser-fixture environment (synthetic, disposable, seeded through the
accepted boundaries): one Songhealth Editor with full module scope; an
eligible Basic Page; the Draft Basic Page titled "Preview Contract Fixture"
(spec-pinned); an eligible Document Resource with a valid attachment and a
Draft Document Resource with a valid attachment; mid-test state changes
through the documented wp-cli control.

## 2. FR-024 risk-category matrix

| FR-024 risk category | Songhealth-owned evidence (result) |
| --- | --- |
| Immutable identity | `PublicIdRegistryTest` (incl. the new set-based `mappings_for` resolution) — passing inside the 76/1278 unit result |
| Public projection | `PublicProjectorTest` (incl. the FR-031 at-bound, over-bound, order/dedup, and set-based query-instrumentation tests) + `PublicRestContractTest` allowlists + frontend contract + browser rendering — all passing |
| Current eligibility | `PublicEligibilityTest`; authoritative-item and eligibility-change cases; binary freshness; plus the FR-031 proof that set-based loading leaves `PublicEligibility` the sole authority for every emitted reference — all passing |
| Native-surface containment | Containment suite both modes: 24/240 no-probe, 24/254 live-probe (live Apache direct-access denial and native media REST containment over HTTP) |
| Authorization / default deny | `AuthorizationBoundaryTest`; the FR-031 authorized-write boundary (100 accepted / 101 refused atomically / previous set preserved / duplicates cannot bypass the pre-normalization bound) inside the 96/1657 integration result |
| Preview confidentiality | `PreviewContractTest` (incl. the new whole-Preview FR-031 failure with unchanged `private, no-store` / `noindex` / `nosniff` headers) + staff-preview browser suite (12 passed) |
| Protected-binary revocation | `ProtectedBinaryContractTest` + `ProtectedBinaryBypassTest` + protected-document browser suite (8 passed) |
| Configuration rejection | `DiagnosticsSafetyTest` 13 invalid variants, every one fail-closed with the stable corrective category only |
| Diagnostic nondisclosure | `DiagnosticsSafetyTest` nondisclosure case (closed status vocabulary; sentinel values never echoed) + `nondisclosure-audit.md` (T059) |
| Canonical routing | public-foundation browser suite + `foundation.test.tsx` — passing |

## 3. FR-031 reconciled reference boundary (G07-B01)

Verified end to end by the new tests and the live probes recorded in
`bounded-performance.md` (T058):

- **Raw-count preflight before iteration/normalization** — detail, listing
  (combined across participating Basic Pages), and Preview count raw stored
  entries before any reference is read or normalized.
- **Atomic authorized-write rejection** — 101 raw submitted lines are refused
  before any field of the submission is written; the previous reference set,
  summary, and visibility are preserved exactly; duplicates or malformed
  input cannot bypass the pre-normalization bound.
- **Whole-response bounded safe failure** — an over-bound record, or a
  combined listing count above the budget, fails the entire detail/listing
  response through the bounded `songhealth_unavailable` 500 class and the
  entire Preview projection through the same class with Preview
  confidentiality headers: no partial body, no truncation, no count
  disclosure, no implied completeness; stored data is never silently
  repaired.
- **Set-based resolution, fixed query shape** — at most ONE set-based Public
  ID mapping query and ONE set-based referenced-post load per response, with
  request-local mapping/post/meta caches; the instrumented test proves the
  single-key registry, single-post, and single-row metadata lookups do not
  grow with the reference count (1 vs 25 references).
- **Eligibility authority unchanged** — `PublicEligibility` decides every
  emitted reference; bulk retrieval reproduces no eligibility semantics;
  order and deduplication are preserved; a public Basic Page never elevates
  an ineligible/unknown/withdrawn/wrong-type reference.

## 4. SC-001–SC-011 disposition

| Criterion | Disposition |
| --- | --- |
| SC-001 allowlisted public fields only | PASS — allowlists pinned in suites; the FR-031 failure envelope adds no field |
| SC-002 immutable identity, one canonical destination | PASS — identity tests; retitle/slug cases unchanged |
| SC-003 non-public records undisclosed | PASS — containment (both modes), neutral classes; the FR-031 failure discloses neither reference nor count |
| SC-004 binary eligibility matches owner | PASS — binary suites and browser spec unchanged |
| SC-005 privileged/Preview default deny | PASS — authorization/Preview suites; 0 privileged credentials in the public client |
| SC-006 React foundation without superseded backend | PASS — frontend contract; browser suites against the Songhealth contract only |
| SC-007 configuration/diagnostics fail closed, 0 disclosure | PASS — `DiagnosticsSafetyTest` matrix; live probes |
| SC-008 evidence for every FR-024 category, none skipped | PASS — §2; the only recorded skips are the two no-probe containment cases, covered by the no-skip live-probe run in the same sweep |
| SC-009 Production facts from real Bangmod evidence | **RETAINED `DEFERRED-EVIDENCE-GATE`** — no actual Bangmod account access this run; all twelve capability facts remain deferred; no assumed PASS |
| SC-010 Delivery 001 assets classified, none deleted | PASS — register unchanged (12/12 `removal_authorized=false`); no registered asset path touched and no file deleted anywhere (`delivery-002-scope-audit.md`) |
| SC-011 no prohibited scope | PASS — `delivery-002-scope-audit.md` regenerated from exact Git endpoints |

## 5. Retained DEFERRED-EVIDENCE-GATE items

`tests/successor/bangmod-capability-evidence.md` remains authoritative. No
actual Bangmod account access was available to this run, so all twelve
Production-specific facts remain explicitly `DEFERRED-EVIDENCE-GATE`; this
matrix converts no unavailable evidence into an assumed PASS.

## 6. Environment notes and honest disclosures

- One browser attempt recorded `29 passed, 1 failed` — the Preview-binary
  case failed once under parallel workers (the staff-preview spec mutates
  the shared synthetic editor's state mid-suite). The same test passes in
  isolation and the immediately repeated full sweep passed 30/30 with no
  change; recorded as a one-off fixture-race, not a product defect.
- The registered meta schema itself normalizes reference writes, so a
  persisted over-bound set requires distinct entries; the over-bound tests
  and live probes seed exactly that legacy/bypassed shape.
- The full-project `vitest --project unit` still includes Delivery 001's
  preserved `server.test.ts` (needs the retired `@songhealth/server` build
  output); the accepted filtered subset (`foundation.test.tsx`, 9 passed) is
  the Delivery 002 verification command, unchanged from all prior gates.

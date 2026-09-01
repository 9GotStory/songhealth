# US4 Sustainable Successor Foundation Evidence — Delivery 002 Gate 06 (T048–T056)

Quickstart sections 1 and 8–10 evidence for User Story 4 (tasks.md T056).
Recorded by the DEV Executor against the exact candidate worktree;
independent review and task acceptance are Codex/Human owned.

- **Base:** `b827f2c735b4d4dd4f324f7aed1e9747f98cdd48` (`feat: complete Delivery
  002 Gate 05`, the canonical implementation base named by the Gate 06
  authorization)
- **Candidate:** this batch's tree on branch `agent/claude-developer/g06`,
  persisted as one commit whose sole parent is the base (see the
  IMPLEMENTATION_RESULT for the exact SHA), plus the G06-B01 corrective
  commit (review round 1) preserving that implementation commit in linear
  ancestry. The handoff additionally named a persisted authorization commit
  `1ef98d2`; that object is not resolvable in this checkout or on the GitHub
  remote (its branch was deleted and the object garbage-collected), so the
  canonical base above — confirmed independently by the Gate 06 issue body —
  is the recorded parent. The reviewer confirmed `1ef98d2` exists in the
  reviewer checkout as a governance-only commit and that the implementation
  lineage correctly rests on `b827f2c`.
- **Environment profile (disposable local verification only):** WordPress 7.1
  core / PHP 8.3.33 / MySQL 8.4 (the digest-pinned Gate 01.5 verification
  images), PHPUnit 9.6.36 + wp-phpunit 7.1.0, Node 24.11.0 / npm 11.6.1,
  Vitest 4.1.10, TypeScript 5.9.3, Vite 8.2.1. One-shot `wordpress:cli`
  container per suite invocation with a fresh disposable `wordpress_test`
  database; live-HTTP probes against the loopback verification runtime
  (Apache/2.4.68, mod_php). No Production parity claim and no Bangmod account
  access (see §4).

Evidence omits secrets, cookies, nonces, complete grants, CMS usernames,
paths beyond the committed examples, SQL, protected file content, and stored
filenames.

## 1. Quickstart §1 — config and diagnostics (T048, T052, T053)

**Valid startup is actionable.** With the complete valid configuration, the
creation service accepts new protected resources, the data-bearing REST
surfaces serve (an unknown identifier is the neutral 404 class), and the
operator report shows per-setting status from CLOSED vocabulary only — every
setting, secret and non-secret alike, contributes `set-and-valid` or its
bounded failure category; the literal environment name and origin URL never
appear in any diagnostics output (G06-B01).

**Every invalid variant fails closed BEFORE protected work is accepted.**
`DiagnosticsSafetyTest` drives 13 variants — each setting missing (3),
environment not allowlisted, origin malformed / not bare / unsafe scheme /
malformed host, secret too short / unsafe characters / placeholder value, and
the two wrong-origin production rules (http scheme, dotless host) — and every
one:

- reports the stable corrective category (`missing`,
  `environment_not_allowlisted`, `origin_malformed`, `origin_not_bare`,
  `origin_scheme_unsafe`, `origin_host_malformed`, `secret_too_short`,
  `secret_characters_unsafe`, `secret_placeholder_value`) through
  `validation_issues()`/`safe_status()`, never the value;
- refuses new resource acceptance at the creation-service boundary
  (`configuration_invalid`, nothing written);
- withholds the data-bearing `songhealth/v1` surfaces (detail, listing,
  Preview, Preview binary, Document binary) from dispatch — the bounded
  `songhealth_unavailable` class before any handler runs — while the operator
  channels stay reachable;
- keeps minimal public liveness at 200 with the identical fixed body in every
  state.

**Operator evidence is bounded and correlated.** One log line
(`[songhealth-core] startup validation failed — configuration: invalid
[key=category,…]; correlation=shdiag-…`), one wp-admin notice rendered only
to the currently authorized settings-capable actor while invalid, and the
protected diagnostics report share the same deterministic correlation code —
a one-way digest of category statuses only. The code is stable per state,
changes when the state changes, and encodes no value.

**Protected diagnostics require current authorization.** Anonymous,
non-staff, and staff without the frozen settings capability share ONE bounded
403 denial class (identical status, code, message, headers); the
administrator report is exactly `{code,status,correlation,categories{configuration,identity_registry}}`;
demotion denies the next request; promotion restores it.

**Public liveness is minimal.** `GET /songhealth/v1/health` answers
`{"status":"ok"}` with `no-store`/`nosniff` — one fixed field, no requester
or state variation across valid/invalid/unsafe configuration.

**Zero disclosure.** The nondisclosure case seeds a sentinel signing-key
value, a sentinel VALID public origin plus the real environment name, a
sentinel UNALLOWLISTED environment name plus a sentinel bad-scheme origin,
a sentinel protected record, and a sentinel CMS login, then drives every
output of this batch (liveness, anonymous + authorized diagnostics, data
surfaces, operator evidence, admin notice) in BOTH the valid and the
invalid state, and asserts none contains: the secret value, the valid or
offending environment/origin literals (G06-B01), database
credentials/name, the installation path, the table prefix or registry SQL
vocabulary, protected record content, CMS user identity, PHP/WordPress
versions, or stack/exception text. The authorized report's shape and
per-setting status vocabulary are pinned against the closed set
(`set-and-valid` + the bounded T006 failure categories), and the
strengthened cases demonstrably fail against the pre-corrective report
shape.

## 2. Quickstart §1 — live-HTTP probes against the verification runtime

With the runtime's WordPress carrying no configuration (the harness's normal
state — it predates T053):

```text
GET /?rest_route=/songhealth/v1/health        → 200 {"status":"ok"}
GET /?rest_route=/songhealth/v1/diagnostics   → 403 songhealth_diagnostics_forbidden
GET /?rest_route=/songhealth/v1/resources&type=basic-page
                                              → 500 songhealth_unavailable   (fail closed)
container log: [songhealth-core] startup validation failed — configuration:
invalid [environment=missing, public_origin=missing,
preview_signing_key=missing]; correlation=shdiag-ebc542c5acf3
```

After supplying the disposable profile configuration through the wp-config
constant channel (the second declared T006 source; session-local volume
state, removed again after the probe):

```text
GET /?rest_route=/songhealth/v1/resources&type=basic-page → 200 {"data":[],"hasMore":false}
GET /?rest_route=/songhealth/v1/resources/basic-page/<unknown> → 404 songhealth_not_found
GET /?rest_route=/songhealth/v1/health                     → 200 {"status":"ok"}
```

The injected lines were then removed; the fail-closed state returned, and
`scripts/wordpress-verification.sh ready` still proves
`READY wordpress=7.1 songhealth-core=0.1.0 active-plugins=songhealth-core`
(the runtime's own readiness contract is unaffected by T053). Extending the
runtime compose/env surface to carry the profile configuration natively is
left to the runtime's owning gate, not this batch.

## 3. Quickstart §8 — security/dependency evidence (T049)

Full procedure and execution record: `tests/successor/dependency-security-review.md`.
Headline results for this batch: `composer audit --locked` → no advisories;
`npm audit` (production and all scopes) → 0 vulnerabilities; locked installs
sound (Composer lockfile verified; `npm ci` → 215 packages); both graphs
carry requirement justification, ownership, maintenance/update path, and
replacement notes; no dependency added, removed, or re-pinned; available
updates (patches and toolchain majors) recorded and deliberately not taken
(no driving advisory or requirement; FR-023 / Constitution II).

## 4. Quickstart §9 — actual Bangmod evidence gate (T050, T054)

Full record: `tests/successor/bangmod-capability-evidence.md`. **No actual
Bangmod account access is available to this run.** All twelve capability
facts (PHP/extensions, database, HTTPS/domain/document roots, protected-file
controls, Git/deployment, cron/CLI, logs, backup/restore, React hosting,
route handling) remain `DEFERRED-EVIDENCE-GATE`. No Production version or
capability lock is created or assumed; public documentation is not treated
as account proof; no environment detail is invented.

## 5. Quickstart §10 — controlled successor proof (T051, T055)

Full register: `tests/successor/delivery-001-asset-classification.md` — 12
asset groups classified (KEEP / REUSE / SUPERSEDED), each with replacement
boundary, replacement evidence only where an implemented and
independently-reviewed successor behavior exists, reviewer fields, and
`removal_authorized=false` (12/12). Preservation proof for this batch:

```text
$ git diff --name-status b827f2c735b4d4dd4f324f7aed1e9747f98cdd48 -- apps/admin apps/server infra/ scripts/ tests/verification bootstrap/ specs/001-application-foundation .env.development.example .env.verification.example .env.real-engine.example
(no output — zero modifications to every registered Delivery 001 asset path)
$ git status --porcelain | grep -c '^ D\|^D'    → 0 deletions anywhere
$ git diff --check                               → clean
```

## 6. Regressions (accepted T001–T047 behavior preserved)

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite unit
OK (73 tests, 956 assertions)
$ php vendor/bin/phpunit --testsuite integration
OK (90 tests, 1580 assertions)
  of which pre-existing (excluding the new @group diagnostics):
  OK (69 tests, 1226 assertions); new T048 cases: 21 tests (13 data-provider variants + 8 methods);
  after the G06-B01 corrective the focused diagnostics cases run 354 assertions,
  and they demonstrably FAIL (3 failures) against the pre-corrective report shape
$ php /repo/composer.phar test:containment        # documented no-probe mode
OK, but incomplete, skipped, or risky tests! (24 tests, 240 assertions, 2 skipped)
$ cd apps/web && npx vitest run --project contract        → 22 passed
$ npx vitest run --project unit app/routes/foundation.test.tsx → 9 passed
$ npx tsc -p tsconfig.json --noEmit                        → clean
$ npm run build:web                                        → react-router build ✓
$ php -l <each changed PHP file>                           → no syntax errors
```

Browser e2e suites were not run in this batch: no frontend file changed, and
the cross-suite acceptance/browser matrix is the T057 scope (not authorized).
The two containment skips are the live Apache probe cases, skipped with
recorded reasons in the documented no-probe mode; they exercise
storage-server denial untouched by this batch. The containment assertion
count grew by 8 over the Gate 05 no-probe record because the two new operator
routes feed the per-route containment loops — more approved shapes covered,
no assertion weakened.

**Accepted tests updated — fixture re-pinning only, no assertion weakened,
deleted, skipped, or substituted:**

- `tests/bootstrap.php` now supplies the disposable profile's complete valid
  baseline configuration (env-var channel, set-if-absent), as a real
  deployment would. Required by the strengthened fail-closed boundary: with
  no configuration the profile would exercise the outage path instead of the
  behavior under test. `DiagnosticsSafetyTest` pins each invalid variant
  explicitly against this baseline.
- `RoutesTest::test_exactly_the_approved_route_shapes_are_registered` and
  `PluginLifecycleWiringTest` route-inventory count (6 → 8 namespace
  entries): the two new operator channel shapes (liveness, diagnostics).
- `CreateTimePublicId::create()` gained the fail-closed configuration gate
  (new refusal code `configuration_invalid`, before any write) — a
  strengthening of the accepted creation boundary in service of FR-021; the
  admin creation flow already renders any service failure as the bounded
  503 message, unchanged.

## 7. Evidence-schema consistency (all four US4 records)

Checked against data-model.md §Verification Evidence (stable scenario
identifier, risk category, non-sensitive environment profile, result,
evidence reference, reviewer): this record carries the US4 summary with
Quickstart §1/§8/§9/§10 mapping and per-section results;
`dependency-security-review.md` carries the dependency/advisory results
(§3); `bangmod-capability-evidence.md` carries the twelve hosting facts with
per-fact `DEFERRED-EVIDENCE-GATE` results (§4);
`delivery-001-asset-classification.md` carries the twelve successor rows
with per-row classification, evidence, and `removal_authorized=false` (§5).
All four reference the same base/candidate identity; none contains a secret,
credential, nonce, path beyond committed examples, SQL, protected content,
or CMS identity.

## 8. Deviations and environment limits

- `1ef98d2` (named persisted authorization commit) is unresolvable locally
  and on the remote; the canonical base `b827f2c` is used and recorded as the
  parent (flagged for reviewer verification).
- No actual Bangmod account access (§4) — the deferred hosting gate is
  preserved, not fabricated.
- Live-HTTP operator-evidence demonstration used the runtime's generated
  wp-config constant channel, restored afterward (§2); the runtime compose
  itself carries no SONGHEALTH_* plumbing (pre-T053 artifact).
- Browser e2e not run (T057 scope; no frontend change in this batch).

## 9. Security/privacy notes

- The dispatch gate answers the SAME bounded class for every withheld
  surface and every invalid-configuration cause; no public observable
  distinguishes which setting or category failed.
- The diagnostics surface is default-deny, re-decided per request from live
  actor state, and its report is assembled from closed status vocabulary:
  each configuration setting reports `set-and-valid` or its bounded failure
  category, so no configured environment name, origin URL, or secret value
  is ever echoed (G06-B01).
- The correlation code digests category statuses only; two operators with
  the same failure signature see the same code, and nothing else can be
  derived from it.
- Startup log lines and admin notices carry the redacted summary and
  correlation code only — never a value, path, query, identity, record, or
  stack.

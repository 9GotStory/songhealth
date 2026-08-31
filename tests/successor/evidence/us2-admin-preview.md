# US2 Admin & Preview Evidence — Delivery 002 Gate 04 (T030–T038)

Quickstart sections 5 and 7 evidence for User Story 2 (tasks.md T038). Recorded
by the DEV Executor against the exact candidate worktree; independent review and
task completion are Codex/Human owned.

- **Base:** `9b2a8296b1835f100d9a5e389dd466d3d6a84897` (`002-headless-wordpress-foundation`)
- **Candidate:** uncommitted working tree on branch `agent/claude-developer/e72167cf97c3`
  (checkout of the base commit plus this batch; no commit made — persistence is
  the Gate's post-PASS step). Corrective round G04-B01–B03 applied to the same
  candidate (see `## Corrective round`).
- **Changed/new files:** see `## Scope` below
- **Environment profile (disposable local verification only):** WordPress 7.1 /
  PHP 8.3.33 / MySQL 8.4 (the digest-pinned Gate 01.5 verification images),
  PHPUnit 9.6.36 + wp-phpunit (composer lock), Node 24.11.0 / npm 11.6.1,
  Vitest 4.1.10, Playwright 1.62.1 (Chromium). Browser runs used the live
  runtime at a loopback origin with the React application served by the
  repository's dev runner and the plugin bind-mounted read-only from this
  checkout. No Production parity claim.

Evidence omits secrets, cookies, nonces, complete grants, CMS usernames,
paths beyond the committed examples, SQL, and protected content.

## 1. Test-first evidence (T030–T032 written before T033–T037)

The three verification definitions were authored and run against the base
commit's pre-controller Preview handler and absent admin/React surfaces before
any US2 implementation existed.

| Suite (task) | Pre-implementation observation |
| --- | --- |
| `AuthorizationBoundaryTest` (T030, integration) | 10 tests / 64 assertions, 3 errors — every decision-primitive case green against the accepted T008/T009 behavior; the three live-Preview cases errored on `Class "SonghealthCore\Preview\PreviewController" not found`, the documented expected red. |
| `PreviewContractTest` (T031, integration) | 14 tests, all erroring on the missing `PreviewGrant`/`PreviewController` classes — the documented expected red, no fixture or syntax errors. |
| `staff-preview.spec.ts` (T032, browser) | 9 failed / 3 skipped / 4 passed: the wp-admin edit screen carried no Songhealth metabox or Preview entry point, the web application had no `/preview` route, and the authorized flow could not start — failing on the missing behaviors, not on fixtures. |

## 2. Quickstart §7 — Authorization / default deny (T030, T033)

PHPUnit integration suite through the live REST surface (fresh disposable
`wordpress_test` database per suite; one-shot container in the pinned
wordpress:cli image with the pinned WordPress 7.1 core as `ABSPATH`):

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite integration
OK (44 tests, 799 assertions)
```

(24 new US2 cases on top of the accepted 20; the containerized invocation used
for the recorded run is documented in §6.)

Recorded behavior:

- **Role/capability matrices:** Viewer/Editor/Publisher/Administrator follow the
  frozen matrices exactly (view in every state; create/edit-draft at Editor;
  publish/save-published at Publisher; document correct-published and the
  administrative domain at Administrator).
- **Actor/action/scope/object/field/lifecycle/relationship context:** anonymous,
  disabled, absent-role, out-of-scope, wrong-module, absent/unsupported-object,
  protected-field (`public_id`), unlisted-field, wrong-lifecycle, and
  `confers_authority` relationship declarations each deny with their bounded
  reason category; legitimate decisions allow.
- **Default deny:** unknown capability names, unknown modules,
  capability/module mismatches, and any unrecognized request key deny the whole
  request.
- **Nonce is not authorization:** a valid `wp_rest` nonce attached to a
  capability-less actor changes nothing — the decision primitive takes no nonce
  input, and the live Preview surface answers the neutral class for a
  nonce-carrying unauthorized request.
- **Self-escalation denial:** a capable actor cannot change their own role or
  account status; capability-less actors deny on capability; unknown role or
  status values deny on the value.
- **Last-Administrator protection:** the guard's truth table is proven against
  the live user store (a second active Administrator disables the guard;
  disabling every other active Administrator arms it for the remaining one; a
  non-Administrator target is never protected). The frozen capability map
  grants no permissions-manage authority outside the active Administrator set,
  so no decision path can reach the guard's denial today — it is defense in
  depth for exactly that future configuration, and the tested truth table is
  the protection proof.
- **Next-request revocation/demotion:** demotion, scope loss, and disablement
  each deny the very next decision — no cached authority — proven both through
  the decision primitive and through the live Preview REST surface.
- **Draft creation / Public ID continuity:** a Draft created through the
  accepted creation service is accepted with its immutable Public ID; retitle,
  slug change, and lifecycle change leave the identity byte-identical; raw Core
  insertion of a supported type is refused before any write.

## 3. Quickstart §5 — Preview authorization/isolation (T031, T034–T037)

PHPUnit integration (same run as §2) recorded:

- **Valid grant behavior:** an in-scope editor's initiation produces a bounded
  navigation target; the retrieval returns the explicit candidate projection
  for the Draft and for a published record alike.
- **Integrity:** byte-flipped, character-swapped, truncated, appended,
  whitespace-padded, alternate-alphabet, empty, and garbage tokens all fail
  closed as the one neutral class.
- **Expiry:** an explicitly expired grant fails closed; the issued lifetime is
  120 s and the payload's expiry is enforced strictly.
- **Purpose/audience:** correctly sealed tokens whose purpose or audience is
  not the fixed `preview` value do not verify (white-box minted under the
  configured key); wrong-version tokens fail closed the same way.
- **Resource/type binding:** a Basic Page grant used against the Document
  Resource route, or against another record of the same type, denies; malformed
  and unknown identifiers are the same neutral denial.
- **Revision binding:** after any save of the record, the single-purpose grant
  no longer applies.
- **User binding:** a different authorized staff member cannot use another
  user's grant; the bound user's own request still succeeds.
- **Active session:** anonymous and non-staff authenticated requests carrying
  a valid grant both receive the neutral denial; there is no anonymous
  fallback anywhere.
- **Fresh authorization:** disablement, scope loss, and demotion below the
  staff boundary each deny the NEXT request (a demotion to Viewer correctly
  does not — Viewer holds the view capability in every state; that matrix fact
  is pinned separately).
- **Neutral denial equivalence:** every denial condition shares one observable
  contract — status, code, body, and headers identical to the unknown-record
  reference, so no condition is distinguishable from outside.
- **Bounded projection:** the candidate DTO is exactly the allowlisted fields;
  sentinel meta, the internal post type, lifecycle values, CMS user identity,
  and the internal post ID never appear (whole-value walk); the Document
  Resource candidate carries no binary path (US3 owns that surface).
- **Confidentiality headers:** success carries `Cache-Control: private,
  no-store`, `X-Robots-Tag: noindex, nofollow`, and `nosniff`; every denial
  carries the same posture.
- **Grant payload secrecy:** opened under the configured signing key for audit,
  the token carries binding context only — no title, body, summary, or other
  content, and no credential; the opaque token text itself reveals nothing.
- **Nonce/origin as supplemental controls:** a request with no Origin/Referer
  evidence denies; an unapproved origin denies; a presented-but-invalid nonce
  denies; the initiation's own handoff nonce rides along and adds nothing but
  CSRF defense.

Browser suite (T032) against the live full stack — synthetic staff identity,
seeded Draft fixture created through the accepted creation service, the React
application served with its public API origin, and the documented wp-cli
control workflow of the runtime for the mid-test state changes:

```text
$ npx playwright test tests/e2e/staff-preview.spec.ts
  12 passed (2.8m)
```

Recorded behavior:

- **Bounded admin entry points (T033):** the wp-admin menus present the
  Songhealth work-language labels; the edit screen presents the identity
  metabox with the read-only Public ID (canonical shape) and a
  capability-aware Preview entry point routed through `admin-post.php`.
- **Authorized flow:** initiation opens the React application at
  `/preview/{type}/{publicId}` — the navigation URL carries no query string;
  the one-time handoff (opaque grant + platform nonce) travels in the URL
  fragment, which no server receives, and is stripped from the address bar
  immediately after consumption.
- **Visible non-public labeling:** the view carries a prominent non-public,
  read-only banner; no lifecycle mutation control, no wp-admin action form,
  and no analytics capture exist in the document.
- **Crawler/canonical isolation:** exactly one `robots` meta with
  `noindex, nofollow`; zero canonical links; no public page links into
  `/preview/`.
- **Confidentiality headers:** the retrieval API answers 200 with cache
  directives that include `private` and `no-store` and `X-Robots-Tag:
  noindex, nofollow` (the platform layers additional no-cache directives onto
  authenticated REST answers; the served value is at least the required
  posture).
- **Logout:** the native logout destroys the page's own session; the next
  request is the neutral 404 with no candidate disclosure. A request that
  still presents the now-dead handoff nonce receives the platform's own
  bounded cookie-check failure (403) — also nondisclosing.
- **Disablement / demotion / scope loss (via the runtime's documented wp-cli
  workflow):** each denies the very next request, and the rendered view falls
  back to the bounded not-available answer with no candidate content.
- **Expiry:** after the grant lifetime elapses, the next request denies and
  the view shows the bounded not-available answer.
- **Direct URL:** a logged-in navigation to the Preview path without a handoff
  renders no candidate; the REST surface without a grant answers the neutral
  404.
- **Anonymous/SSR:** the server-rendered document of an unauthenticated
  request contains no candidate content and no CMS-internal markers.
- **Public nondisclosure:** the Draft fixture stays neutral (404) on its
  public canonical route; the home page links nothing into `/preview/`.

## 4. Regressions (accepted T001–T029 behavior preserved)

```text
$ cd wordpress && php vendor/bin/phpunit --testsuite unit
OK (73 tests, 944 assertions)
$ cd wordpress && composer test:containment
OK (19 tests, 201 assertions)
$ cd apps/web && npx vitest run --project contract
      Tests  22 passed (22)
$ cd apps/web && npx vitest run --project unit app/routes/foundation.test.tsx
      Tests  9 passed (9)
$ npx playwright test tests/e2e/public-foundation.spec.ts   # US1 browser regression
  10 passed (3.6s)
$ npm run build:web        → react-router build ✓ (client + ssr) and tsc server.ts entry ✓
$ npx tsc -p tsconfig.json --noEmit   → clean (0 errors, repo-wide)
$ scripts/wordpress-verification.sh ready
ready: WordPress serving, songhealth-core loaded and the only active plugin
$ git diff --check        → clean
```

One accepted test was re-pinned, following the Gate 03 precedent for a landing
controller: `RoutesTest::test_malformed_unknown_and_ineligible_identifiers_are_one_neutral_class`
pinned the pre-T035 Preview-branch transport constant `no-store`; the Preview
surface now carries its required confidentiality posture (`private, no-store`)
on every answer, denial included — a strictly stronger posture, with the
one-class-per-surface equivalence assertion unchanged. No test was weakened.

## 5. Security/privacy notes

- The grant is opaque (authenticated-encrypted under a purpose-derived key from
  the dedicated `SONGHEALTH_PREVIEW_SIGNING_KEY` configuration setting,
  validated fail-closed by the T006 schema), is bound to user, resource type,
  Public ID, candidate revision, fixed `preview` audience/purpose, and a 120 s
  expiry, carries no content and no credential, and is stored nowhere —
  revocation therefore never needs to reach it.
- Authorization is only ever the current session plus the fresh default-deny
  decision; the nonce and origin controls are supplemental CSRF defenses and
  grant nothing. WordPress core's own cookie-authentication posture is relied
  on, not bypassed: core treats a session-cookie REST request without a nonce
  as anonymous, so the authorized initiation hands the browser one platform
  nonce (in the URL fragment, never sent to any server) alongside the grant.
- The React Preview client attaches no credential, holds no secret, accepts
  only the bounded candidate DTO (strict decoding; unknown fields and any
  binary path reject the whole response), makes exactly one request to exactly
  one backend with no fallback of any kind, and persists nothing.
- The server-rendered Preview document contains no candidate content at all;
  the candidate reaches the page only through the browser's own authenticated
  session request.

## 6. Environment limits and notes (none weakening a required proof)

- The runtime's `wp-config.php` carries the three Gate 04 verification settings
  from the committed T006 schema (environment name, approved public React
  origin, preview signing key) as disposable local verification configuration;
  no repository configuration artifact changed.
- The dev runner does not forward loader response headers onto the served
  document; the route declares its `private, no-store` answer (applied by the
  framework wherever loader response initialization is applied) and the
  browser case asserts the served document posture whenever the origin applies
  it, while the substantive protections (no SSR candidate, exact API headers,
  noindex, no canonical) are asserted unconditionally.
- ESLint remains not runnable (its config imports devDependencies of later task
  scope, intentionally absent — same non-blocking note as Gate 03). npm 11.6.1
  remains below the `npm >=12 <13` engine pin (same non-blocking note).
- `apps/web` `server.test.ts` (Delivery 001 SSR handoff suite) was not run in
  this batch; Gate 03 recorded it as failing identically on the pristine base
  (pre-existing, untouched by this Delivery).
- The last-Administrator decide-path reachability note in §2.
- PHP/MySQL suites ran in the digest-pinned Gate 01.5 container images with a
  fresh disposable `wordpress_test` database per suite (one suite per
  container invocation, the documented discipline); synthetic data only.

## 7. Scope

Modified tracked files (5): `songhealth-core.php` (module list + comments),
`src/Plugin.php` (wires the admin experience and the Preview initiation
action), `src/Rest/Routes.php` (the Preview route dispatches to the authorized
US2 controller; every Preview-surface answer carries the confidentiality
posture), `tests/unit/RoutesTest.php` (one re-pinned transport constant, §4),
`apps/web/app/routes.ts` (registers the authenticated read-only Preview route).

New files (9): `src/Content/AdminExperience.php` (T033),
`src/Preview/PreviewGrant.php` (T034), `src/Preview/PreviewController.php`
(T035), `tests/integration/AuthorizationBoundaryTest.php` (T030),
`tests/integration/PreviewContractTest.php` (T031),
`apps/web/app/services/songhealth-preview.ts` (T036),
`apps/web/app/routes/preview.$resourceType.$publicId.tsx` (T037),
`apps/web/tests/e2e/staff-preview.spec.ts` (T032), and this evidence file
(T038). The corrective round adds
`tests/integration/AdminExperienceContractTest.php` (G04-B01/B02).

## 8. Corrective round — G04-B01–B03 (Human rework authorization)

Applied to the same uncommitted candidate; base unchanged. Files changed
relative to the reviewed candidate: `src/Content/AdminExperience.php`
(B01/B02), `src/Preview/PreviewController.php` (B03),
`tests/integration/PreviewContractTest.php` (B03 matrix added), this evidence
file, and the new `tests/integration/AdminExperienceContractTest.php`.

- **B01 (functional visibility selector):** `visibility_options()` now returns
  the concatenated escaped `<option>` markup (`sprintf`, `esc_attr`/`esc_html`,
  `selected()` non-echoing) for `render_publication_box()` to place inside the
  `<select>`; nothing is echoed, so no option markup can land outside it. The
  real rendered metabox is parsed as a document in the focused regressions:
  exactly one visibility select, the three allowlisted options as its exact
  element children in order, zero option elements elsewhere in the output,
  exactly the current persisted value selected (proven for public, Hidden,
  Internal, absent-default-public), and no raw markup from a hostile stored
  value (renderer treats it as the default).
- **B02 (invalid visibility fails closed):** an unrecognized, malformed, or
  absent submitted visibility now refuses the entire bounded-field save before
  any write: the persisted visibility is preserved (never broadened, never
  silently reset to the public default), no other field — summary, references,
  identity — is modified by the invalid path, and the bounded notice states
  exactly that outcome (nothing saved, previous visibility kept). Valid
  allowlisted transitions and their companion fields still save normally; a
  write path without this form's nonce is untouched as before.
- **B03 (exact origin boundary):** origin acceptance is now a parsed-origin
  comparison — exact scheme, exact host (normalized case), exact effective
  port (explicit or scheme default) — against the approved public React origin
  and the WordPress home origin. An `Origin` must itself be a bare origin (a
  path, query, or fragment is rejected); a `Referer` may carry a path and
  query only after its parsed origin proves equal, and a fragment is
  malformed. Userinfo of any kind is rejected — including on an otherwise
  exact host — and malformed values, wrong schemes, wrong explicit or
  effective ports, suffix-host confusions, hostname confusions, and
  path-prefix confusions all fail closed with the same neutral confidential
  Preview denial.

Focused corrective verification (same environment and discipline as above):

```text
$ php vendor/bin/phpunit --testsuite integration --filter AdminExperienceContractTest
OK (9 tests, 87 assertions)          # B01 rendered structure + B02 fail-closed matrix
$ php vendor/bin/phpunit --testsuite integration --filter test_b03_origin_boundaries
OK (1 test, 67 assertions)           # B03 exact-origin matrix (4 allowed, 14 rejected shapes)
```

Post-correction full verification:

```text
$ php vendor/bin/phpunit --testsuite integration
OK (54 tests, 953 assertions)
$ php vendor/bin/phpunit --testsuite unit
OK (73 tests, 944 assertions)
$ php vendor/bin/phpunit --bootstrap tests/containment/bootstrap.php tests/containment
OK (19 tests, 201 assertions)
$ cd apps/web && npx vitest run --project contract
      Tests  22 passed (22)
$ cd apps/web && npx vitest run --project unit app/routes/foundation.test.tsx
      Tests  9 passed (9)
$ npx tsc -p tsconfig.json --noEmit   → clean
$ npm run build:web                   → react-router build ✓ (client + ssr) and tsc server.ts entry ✓
$ npx playwright test tests/e2e/staff-preview.spec.ts
  12 passed (2.8m)
$ npx playwright test tests/e2e/public-foundation.spec.ts
  10 passed (3.7s)
$ scripts/wordpress-verification.sh ready
ready: WordPress serving, songhealth-core loaded and the only active plugin
$ php -l <each changed PHP file>      → no syntax errors
$ git diff --check                    → clean
```

Scope note: the corrective changes touch only the two implementation files,
the two test surfaces, and this evidence file. No existing test was weakened,
deleted, skipped, or rewritten to pass; the earlier recorded results above
remain the record of the first round against the pre-correction candidate.

Out of scope and absent: T039+ (including all US3 protected-binary work),
finished Product modules, public Songhealth search, a `/pages` hub, totals/page
counts or OFFSET behavior, a second eligibility/identity/authentication/
persistence/CMS/Admin-SPA authority, privileged frontend secrets, dependency
expansion, Redis/broker/microservice/dedicated search/private object
storage/Production Docker or VPS, Delivery 001 deletion or retirement, and
deploy/import/migrate/cutover work.

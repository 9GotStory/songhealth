# Phase 1 Quickstart: Validation Guide

Future validation guide only; this is not implementation authorization or a full test suite. Exact
commands/version pins are finalized during authorized implementation.

## Prerequisites

- Clean disposable WordPress verification profile with supported PHP/MySQL-compatible database and
  HTTPS-equivalent origin; no Production or unsanitized Production-derived data.
- `songhealth-core`, React Songhealth client, test identities for authorized/unauthorized/revoked/
  insufficient scope, and browser/HTTP/PHP/frontend runners.
- Only Basic Page and Document Resource production shells.

Evidence must omit secrets, cookies/nonces, full grants, paths, SQL, CMS usernames, and protected
content.

## 1. Config and diagnostics

Verify valid startup and operator readiness, then repeat with each required value missing, malformed,
unsafe, or wrong-origin. Inspect React assets, HTTP errors, logs, liveness, and diagnostics.

Expected: invalid config fails closed with only actionable category/correlation evidence; public
liveness is minimal and no forbidden value appears.

## 2. Public ID and canonical detail

Create Draft records of both types; confirm UUIDv7 exists before success. Save, Preview, publish,
retitle, intentionally change slug, withdraw, and republish as allowed. Attempt ID edit/reassignment
and request missing/old/malformed/normalized/current slugs.

Expected: ID never changes/recycles; eligible records have one canonical React destination; current
slug is disclosed only after eligibility; unknown/ineligible are neutral; no WordPress ID is public.

## 3. Detail and leakage-safe bounded listing

Seed eligible/ineligible records with sentinel metadata/user values. Exercise [public-rest.md](./contracts/public-rest.md)
detail/list, page bounds, empty pages, type/order allowlists, attempted search/native params, and an
eligibility change between calls. Compare fields, totals, pages, and errors.

Expected: only eligible allowlisted fields; counts/pages include no suppressed items; stale state does
not authorize; no Songhealth search exists.

## 4. Native-surface containment

Probe eligible/ineligible records through anonymous native REST, single/archive/query-var/search/feed/
sitemap/taxonomy/author/date/oEmbed/Preview/attachment/direct-Media paths and encoding variants.

Expected: none exceeds Songhealth eligibility, exposes CMS fields/users, or competes with React
canonical routes; authenticated editor infrastructure remains bounded by current authority.

## 5. Preview authorization/isolation

Run authorized Preview, then unauthenticated, unauthorized, wrong-object/scope, tampered/expired/
cross-resource grant, direct URL, and missing nonce/origin cases. Re-request after logout, disablement,
demotion, or scope revocation. Inspect caches/storage/robots/public surfaces/logs/client bundles.

Expected: only fresh authorized requests succeed; revocation affects the next request; Preview is
private/no-store/noindex/read-only and leaks no credential/public trace.

## 6. Binary publish/revoke

Upload/associate a safe file to a Draft Document Resource and retain every URL. Try approved/raw/
native/attachment paths while non-public; publish and download; reference from public Basic Page;
make Document Resource ineligible while parent stays public; retry all URLs/cache variants. Include
unknown ID, broken relationship, unsafe metadata/type, range, and neutral-failure cases.

Expected: bytes deliver only while Document Resource itself is currently eligible; reference never
elevates; revocation blocks all known routes without state disclosure.

## 7. Authorization/default deny

Exercise creation, edit, Public ID control, Preview, publication/lifecycle, binary relationship, role
change, self-escalation, and last-Administrator cases through UI/direct request.

Expected: current server actor/action/scope/object/field/lifecycle/relationship checks are authority;
nonce alone grants nothing; CMS User remains separate from Personnel; no custom user store/Admin SPA.

## 8. Security/dependency evidence

Run approved PHP/WordPress coding/unit/integration checks, frontend type/unit/contract/browser checks,
dependency/advisory review for both graphs, and focused CSRF, XSS/output, upload, delivery, error,
abuse-bound, config, and containment regression cases.

Expected: every FR-024 category has evidence; no critical case is skipped or replaced by testing Core
internals alone.

## 9. Actual Bangmod evidence gate

Before Production locks, an authorized operator records redacted direct evidence for available PHP/
extensions, actual database compatibility/access, HTTPS/domain/document-root and protected-file
controls, Git/deployment, cron/CLI only if required, logs, backup/restore, React hosting, and endpoint
routing.

Expected: only reviewed direct evidence creates locks. Missing/contradictory evidence stays
`DEFERRED-EVIDENCE-GATE` and triggers bounded re-evaluation; public docs are not account proof.

## 10. Controlled successor proof

Classify every considered Delivery 001 runtime asset using [data-model.md](./data-model.md), linking
replacement evidence only after independent verification and keeping `removal_authorized=false`.

Expected: all considered assets classified, none deleted, T051+ not resumed, and no importer,
migration, cutover, retirement, or speculative infrastructure appears.

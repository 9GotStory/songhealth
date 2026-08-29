# Phase 0 Research: Headless WordPress Foundation & Public Contract

## Evidence and precedence

Preserve-first precedence applies: final Canonical Freeze Bindings make the append-only amendments
effective; amendments supersede older Fastify/Kysely/custom-Admin mechanisms only where explicit.
Underlying Product, lifecycle, security, accessibility, privacy, URL, search-containment, and
operational requirements remain authoritative.

Public evidence verified 2026-08-29: WordPress Requirements; WordPress REST Authentication, Nonces,
Adding Custom Endpoints, `register_rest_route()`, and `register_post_type()`; Bangmod Expert Hosting
policy and DirectAdmin PHP-selection guidance. These select mechanisms but do not override project
authority.

Public source URLs:

- WordPress requirements: <https://wordpress.org/about/requirements/>
- REST authentication: <https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/>
- WordPress nonces: <https://developer.wordpress.org/apis/security/nonces/>
- Custom REST endpoints: <https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/>
- REST route registration: <https://developer.wordpress.org/reference/functions/register_rest_route/>
- Custom post type registration: <https://developer.wordpress.org/reference/functions/register_post_type/>
- Bangmod Expert Hosting policy: <https://kb.bangmod.cloud/article/policy-expert-hosting>
- Bangmod DirectAdmin PHP selection: <https://kb.bangmod.cloud/article/how-to-change-php-version-in-directadmin>

## 1. Runtime and hosting baseline

**Decision**: Use clean WordPress with MySQL-compatible storage, HTTPS, and PHP. Local/CI uses a
reproducible disposable profile with explicit verification versions but does not claim Production
topology. Target the current official recommendation (PHP 8.3+, MariaDB 10.11+ or MySQL 8.0+).
Production remains Bangmod/DirectAdmin; do not lock Production PHP yet.

**Rationale**: Bangmod public material indicates DirectAdmin, WordPress Manager, Git, MySQL 8.4, and
per-domain PHP selection, but cannot prove Songhealth account versions/modules/features. A clean
profile prevents legacy plugin/theme coupling and remains shared-host portable.

**Alternatives considered**: Production Docker/VPS; Delivery 001 Node/Podman; freezing PHP from
generic docs. Each is unauthorized or unsupported by account evidence.

**Authority/evidence**: FR-002, FR-021–FR-023, FR-028; Constitution II/VI; A00.3, A10.18; cited public
WordPress/Bangmod sources.

**Deferred Production lock**: Before any Production-specific decision, capture redacted actual-
account evidence for PHP/extensions, MySQL compatibility, HTTPS, domain/document roots, protected
storage/deny controls, cron/CLI only if needed, Git/deployment, backup/restore, and log access. Missing
evidence remains deferred or causes bounded re-evaluation; this is not Product clarification.

## 2. `songhealth-core` ownership/bootstrap

**Decision**: One first-party plugin with a thin bootstrap and cohesive modules for type registration,
Public ID, eligibility/projection, authorization, REST, Preview, binary delivery, and diagnostics.
Keep Product rules out of themes and React.

**Rationale**: Plugin-owned types survive theme changes; one bounded plugin is the smallest explicit
owner of non-Core Songhealth semantics.

**Alternatives considered**: Theme ownership, multiple foundational services/plugins, Fastify/Kysely,
or a third-party field framework by default.

**Authority/evidence**: FR-001/023/028; A00.2, A05.3, A10.2–A10.4/A10.20–21; official post-type
guidance.

## 3. Basic Page and Document Resource representation

**Decision**: Register two distinct prefixed custom post types. Each is admin-visible with Songhealth
labels, minimal title/body-or-description/status/history/slug/metadata, explicit capabilities,
`publicly_queryable=false`, excluded native search, and no native rewrite/archive/feed. Authenticated
WordPress REST may support the editor, but anonymous native responses are denied/filtered. Document
Resource owns one protected Media attachment relationship.

**Rationale**: Separate types preserve domain meaning while Core supplies commodity editing. Native
public suppression establishes React/Songhealth REST as canonical.

**Alternatives considered**: Built-in Posts/Pages; one generic type; finished Product models; custom
SQL tables.

**Authority/evidence**: FR-003/009/015/030; Content Model §4/Document rules; A00.4–5, A05.2–3,
A10.9/A10.12; official `register_post_type()` controls.

## 4. Immutable Public ID

**Decision**: Generate UUIDv7 within the first successful server-side creation boundary after a
durable internal record exists but before success is reported. Store the mapping in a tiny
plugin-owned WordPress-database identity registry with a primary/unique Public ID and a unique
`(resource_type, internal_post_id)` key. Treat post creation plus identity insertion as one bounded
transaction where the verified database supports it; otherwise creation is not reported successful
until insertion succeeds and a failed insertion triggers safe compensating cleanup/evidence. Absence,
mutation, caller-selection, collision, or reassignment fails closed. Updates never write it;
trash/deletion leaves a non-reusable tombstone mapping.

**Rationale**: Effective Frozen authority selects UUIDv7. The boundary satisfies Draft issuance;
the dedicated two-key registry supplies database-enforced uniqueness without imposing unsafe global
constraints on WordPress's shared metadata table and prevents native ID/slug/filename/race coupling.

**Alternatives considered**: WordPress ID, slug, UUIDv4, best-effort `save_post` metadata without
uniqueness, a global postmeta uniqueness index with collateral risk, or caller-provided IDs.

**Authority/evidence**: FR-004–005/024; Sitemap §§15.4/17.22; Blueprint §§677–691 and A10.3/A10.19.

## 5. Public REST detail/listing/projection

**Decision**: Read-only `/wp-json/songhealth/v1/resources/{resourceType}/{publicId}` and
`/wp-json/songhealth/v1/resources`. Type is allowlisted to `basic-page`/`document-resource`; list
accepts only type, page, per-page, and allowlisted order with a hard maximum. Query current eligible
records before type-specific projection and pagination/counts. Detail evaluates eligibility before
canonical metadata. Unknown/ineligible share neutral behavior. No search parameter/route.

**Rationale**: Custom controllers prevent WordPress leakage. Shared eligibility/projectors prevent
drift; eligibility-first counts and canonical logic prevent existence leaks.

**Alternatives considered**: Raw `wp/v2`, GraphQL/new schema dependency, cached eligibility authority,
unbounded listing, or Songhealth search.

**Authority/evidence**: FR-006–012/030; A10.8–9/A10.15–16; official endpoint namespacing,
validation, and permission callbacks.

## 6. Native public-surface containment

**Decision**: Layer non-public registration with anonymous REST/metadata filters; suppress both types
from native search, feeds, sitemaps, taxonomy/author/date archives, oEmbed, Preview, attachment/media,
and direct native routes; return neutral 404 and publish canonical links only to React. Test an
enumerated containment matrix. Do not globally disable REST needed by authenticated editors.

**Rationale**: Registration removes most exposure; hooks/tests cover cross-cutting/update regressions.

**Alternatives considered**: `public=false` alone, global REST disablement, or revealing redirects.

**Authority/evidence**: FR-007–009/012/024; A10.8–9 and Frozen routing/nondisclosure.

## 7. React and canonical routing

**Decision**: Add a typed Songhealth client in `apps/web`; rebind only bounded foundation routes.
React renders `/pages/{publicId}/{slug?}` and `/documents/{publicId}/{slug?}`, resolving by Public ID
and redirecting an eligible wrong/missing slug to a validated relative canonical path. Absolute origin
comes only from trusted config. No `/pages` public hub is added; API listing does not alter IA.

**Rationale**: Preserves canonical routes and selectively reuses React without retaining the backend.

**Alternatives considered**: Raw WordPress client, Node adapter, automatic post-publication slug
mutation.

**Authority/evidence**: FR-010–012/030; Sitemap §§3/15; A10.15.

## 8. Authenticated staff-only React Preview

**Decision**: WordPress login/session remains the sole identity authority. An authorized `wp-admin`
Preview action opens React with a short-lived, single-purpose signed opaque grant containing no
credentials/content. A dedicated Preview endpoint validates signature, expiry, audience/resource/
revision binding plus current WordPress authentication, active user, and capability/scope/object
access on every request. REST nonce/origin defends CSRF but is not authorization. Responses are
private/no-store/noindex and excluded from service-worker/public cache/search/crawlers. No anonymous
share token or administrator credential enters React.

**Rationale**: A grant binds navigation while session/fresh server checks remain authority and allow
revocation without a second identity store or unrestricted Draft endpoint.

**Alternatives considered**: Long-lived share links, admin credentials in React, frontend role checks,
parallel SSO/store, or public `preview=true`.

**Authority/evidence**: FR-013–017/024; A05.7–8, roles §42, A10.5–7/A10.11; official REST cookie and
nonce guidance.

## 9. Protected binary delivery

**Decision**: Store originals outside direct anonymous reach (outside public document root when the
account permits, otherwise in a server-denied protected location proven by direct tests). Expose only
a stable Songhealth download route keyed by Document Resource Public ID. At every request resolve the
Document Resource, evaluate its own current eligibility, then stream safely. Parent/reference state
cannot elevate access. Never expose/redirect to raw Media URLs or authorize from stale cache.

**Rationale**: A mediated current-state boundary makes known/bookmarked URLs revocable while Media
Library remains storage infrastructure.

**Alternatives considered**: Public uploads URL, signed URL alone, private object storage, publish-
time duplication, or parent-reference authorization.

**Authority/evidence**: FR-018–020/024; A10.9/A10.13. Filesystem/server realization is reversible and
account-evidence-gated; policy/URL contract is fixed.

## 10. Configuration, diagnostics, dependencies, and verification

**Decision**: Environment-separated allowlisted server config is validated before protected work;
secrets never enter React/source. Public liveness is minimal; authenticated diagnostics return stable
category/status codes, not values, paths, queries, users, records, stacks, or credentials. Review only
dependencies selected during implementation for requirement, compatibility, advisories, ownership,
updates, and replacement. Test Songhealth-owned REST/authz/CSRF/XSS/upload/delivery/containment/config/
canonical behavior across PHP/WordPress and npm/frontend graphs, not Core internals for their own sake.

**Rationale**: Actionable bounded evidence fits hosting/WordPress without reviving Node observability
or adding monitoring infrastructure.

**Alternatives considered**: Public environment/phpinfo, silent failure, new monitoring service,
pre-emptive plugin suite, npm-only audit, or platform-only smoke tests.

**Authority/evidence**: FR-021–025; Constitution I/IV–VI; A10.5/A10.17–20.

## 11. Successor proof / removal-later

**Decision**: Evidence maps each considered Delivery 001 asset to KEEP, REUSE, SUPERSEDED, or
REMOVE-LATER plus replacement boundary, acceptance proof, reviewer, and separate removal authorization.
No deletion occurs and apparent disuse is insufficient.

**Rationale**: Preserves history and creates a controlled later decision without turning Plan into
destructive authority.

**Alternatives considered**: Delete upon implementation, continue obsolete runtime, implicit status.

**Authority/evidence**: FR-026–027; 001 reconciliation; A10.23–24.

## Resolved unknowns

All Plan-owned mechanisms are resolved. Production versions/account capabilities are deliberately
evidence-gated operational locks, not unresolved Product or design clarifications.

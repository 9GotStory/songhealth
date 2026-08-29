# Phase 1 Data Model: Delivery 002 Foundation

Only the two foundation shells and minimum public, Preview, binary, verification, and successor-proof
concepts are modeled. Full Frozen Product domains are excluded.

## Identity distinction

| Identity | Owner | Visibility | Purpose |
| --- | --- | --- | --- |
| WordPress post/attachment/user ID | Core | Internal/admin only | Persistence/CMS relationships |
| Songhealth Public ID registry row | `songhealth-core` in WordPress DB | Public ID only where eligible; row/internal key never public | Durable resource/canonical identity and uniqueness |
| Display slug | Songhealth over Core primitive | Public after eligibility | Optional readability; never identity |

Public ID is UUIDv7, generated on first successful creation including Draft, unique, immutable,
never ordinarily caller-selected, and never recycled. The registry has unique `public_id` and unique
`(resource_type, internal_post_id)` keys; deletion retains a tombstone mapping. Public projections
contain no internal IDs.

## Shared Songhealth Resource policy

This is policy vocabulary, not a generic production type.

| Field | Rule |
| --- | --- |
| `internal_post_id` | Core identity; never public |
| `resource_type` | Immutable `basic-page` or `document-resource` |
| `public_id` | Required after successful creation; UUIDv7; globally unique/non-reassignable |
| `title` | Required to publish; candidate allowed in Draft/Preview |
| `display_slug` | Optional resolution metadata; safely normalized; changed only through authorized behavior |
| `wp_status` | Internal primitive mapped by Songhealth lifecycle; raw value never public on denial |
| `visibility` / `withdrawn` | Current Songhealth eligibility inputs; not disclosed on denial |
| timestamps | Core audit values; only allowlisted dates may project |
| `author_user_id` | Internal CMS User; never public and never Personnel identity |

`eligible = supported type + valid ID + currently public lifecycle + public visibility + not withdrawn
+ type-specific publication validity`. Evaluate at disclosure/delivery time. Projection, list,
reference, cache, slug, ID, or bytes never confer eligibility. Unknown/ineligible are neutral.

## Basic Page Foundation Record

Distinct custom post type with shared fields plus optional summary, minimal controlled body, and
optional ordered Document Resource references. A reference never elevates its target. Canonical path:
`/pages/{public_id}/{display_slug?}`; there is no required `/pages` public hub.

## Document Resource Foundation Record

Distinct custom post type with shared fields plus optional summary/document date and one internal
`binary_attachment_id`, required before publication. Public download path is derived from Public ID,
never storage identity. Canonical path: `/documents/{public_id}/{display_slug?}`.

The attachment owns storage metadata; Document Resource owns anonymous delivery. Delivery requires
its current eligibility and a valid safe attachment. References, attachment status, prior publication,
or URL knowledge cannot elevate it. Loss of eligibility changes subsequent requests to neutral denial.

## Public Projection

Derived non-authoritative DTO. Shared allowlist: `type`, `publicId`, `title`, `canonicalPath`, optional
`summary` and approved dates. Basic Page may contain controlled `body`/eligible references. Document
Resource may contain `downloadPath`. Never expose raw Media URL/filename/path, internal IDs/status,
post metadata, user identity, or protected state.

Listing envelopes contain eligible items and page/per-page/counts computed after filtering; no native
count, suppressed count, search score, or search contract exists.

## Preview Context

| Field | Rule |
| --- | --- |
| `grant_id` | Random opaque identifier; only bounded logging |
| `resource_type` / `public_id` | Exactly one resource |
| `user_id` | Server-side WordPress session binding; never public content |
| `candidate_revision` | Internal candidate reference |
| `issued_at` / `expires_at` | Short validity |
| `purpose` | Fixed `preview` audience/purpose |

The grant is not authorization. Every request needs current authenticated active session and fresh
capability/object/scope decision. Preview is read-only, not lifecycle, and private/no-store/noindex.

## Verification Evidence

Fields: stable `scenario_id`, `risk_category` (identity, projection, containment, authorization,
Preview, binary, config, diagnostics, canonical, dependency, hosting, successor), non-sensitive
`environment_profile`, `result` (PASS/FAIL/DEFERRED-EVIDENCE-GATE), safe `evidence_reference`, time,
reviewer. Public diagnostics never expose CMS identity.

## Successor Asset Classification

Fields: explicit asset/group, KEEP/REUSE/SUPERSEDED/REMOVE-LATER, replacement boundary, replacement
evidence, and `removal_authorized` (always false in Delivery 002 Plan/implementation).

## State transitions

```text
first successful create (including Draft) -> Public ID atomically issued -> non-public default
non-public -> public-eligible             -> authorized valid publication only
public-eligible -> non-public/withdrawn   -> ID retained; public/list/binary access revoked
any lifecycle -> Preview                  -> read-only context, never lifecycle mutation
```

Hard deletion, ID recycling, finished workflow, importer, and migration mapping are out of scope.

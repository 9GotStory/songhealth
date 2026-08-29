# Songhealth Public REST Contract

Base: `/wp-json/songhealth/v1`. This read contract exposes Songhealth concepts, not WordPress, and
does not expose Songhealth public search.

## Detail

`GET /resources/{resourceType}/{publicId}`

- Type is `basic-page` or `document-resource`; ID is canonical UUIDv7 text.
- Resolve by Public ID, never slug/internal ID; check current eligibility before projection or
  canonical metadata.
- Unknown, malformed, and ineligible use the same bounded `404` class without existence/lifecycle
  distinction.
- Eligible DTO allowlist: `type`, `publicId`, `title`, `canonicalPath`, optional `summary`/approved
  dates; Basic Page may include controlled `body`; Document Resource may include approved document
  fields and `/wp-json/songhealth/v1/documents/{publicId}/binary` as `downloadPath`.
- Never return WordPress IDs/status, raw post/meta/attachment values, Media URLs/paths, config, or
  CMS user identity.

## Bounded listing

`GET /resources?type={resourceType}&page={n}&perPage={n}&order={order}`

- Type is required and allowlisted. Page/per-page are positive and bounded with a small default and
  hard server maximum. Order is an allowlist with deterministic Public ID tie-breaker.
- No keyword/search/suggestion/raw-filter/native-query parameter is supported.
- Eligibility is in the query boundary before pagination; `total`, `totalPages`, empty pages, and
  navigation metadata derive only from eligible rows.

```json
{"data": [], "page": 1, "perPage": 20, "total": 0, "totalPages": 0}
```

Basic Page API listing proves the clarified bounded-list behavior but creates no public `/pages` hub,
navigation item, or canonical listing route.

## Canonical behavior

DTOs supply a validated relative canonical path:

- `/pages/{publicId}/{slug?}`
- `/documents/{publicId}/{slug?}`

React resolves via detail by Public ID. Eligible missing/outdated/noncanonical slugs redirect directly
to current canonical path. Eligibility precedes slug disclosure/redirect. Unknown/ineligible records
are never blindly redirected to the homepage.

## Projection, references, errors, transport

- Explicit type projector only; default serialization is forbidden.
- An eligible parent cannot elevate an ineligible reference; omit/neutralize it after its own current
  decision.
- Cache is never eligibility authority.
- Invalid list input returns bounded `400`; unexpected failure returns generic `5xx` with a safe
  category/correlation code. No stack, SQL, path, credential, user, or protected content.
- Use JSON, deployed HTTPS, safe cache headers, and applicable abuse/rate bounds.

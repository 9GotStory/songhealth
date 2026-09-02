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

`GET /resources?type={resourceType}&perPage={n}&order={order}&cursor={opaqueCursor?}`

- Type is required and allowlisted. `perPage` is positive and bounded with a small default and hard
  server maximum. Order is allowlisted and uses deterministic Public-ID keyset progress. Deep OFFSET
  pagination is not supported.
- Cursor is optional, confidential, and integrity/tamper protected; binds type and order; carries safe
  version/expiry state; and reveals no internal identifier, scanned ineligible Public ID, eligibility
  state, or database position. Malformed, expired, mismatched, or tampered cursors fail closed with the
  bounded neutral invalid-request class. This contract does not require a persistent cursor store.
- No keyword/search/suggestion/raw-filter/native-query parameter is supported.
- Each request selects bounded candidate windows and evaluates at most a hard server-controlled
  candidate budget. Query logic may maintain keyset progress but never reproduces or decides
  eligibility; every returned item passes the live authoritative `PublicEligibility` decision.
- Return at most `perPage` items. `hasMore` reports deterministic continuation, not an eligible count.
  `nextCursor` is present exactly when continuation is available. When the scan budget ends before an
  eligible item is found and candidates remain, return empty `data`, `hasMore=true`, and an opaque
  `nextCursor`; never expose the scanned boundary or falsely report exhaustion.
- Exact public `total` and `totalPages` are not part of this Delivery 002 foundation contract.

```json
{"data": [], "hasMore": true, "nextCursor": "<opaque>"}
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
- Basic Page Document Resource references share one hard server-owned budget of 100 raw stored entry
  work units per detail, listing, or Preview response. The budget is not a request parameter or public SLA.
- Authorized writes reject an over-bound stored set atomically. At projection time, validate every
  Basic Page raw set and the combined raw response count before iteration or normalization; deduplicate
  within the budget in stored order; use at most one set-based mapping query and one set-based post
  load for the response with request-local mapping/post/meta caches primed; and apply the unchanged
  `PublicEligibility` decision to every candidate without further per-reference queries. Bulk loading
  is retrieval only and never decides eligibility.
- A legacy/bypassed over-bound set or combined response above the budget fails the whole projection
  through the generic bounded `5xx` class. Never return a partial DTO/list/Preview body, silently
  truncate references, imply that an incomplete collection is complete, reveal the offending value,
  or add reference pagination/a client limit/new route.
- Cache is never eligibility authority.
- Invalid list/cursor input returns bounded `400`; unexpected failure returns generic `5xx` with a safe
  category/correlation code. No stack, SQL, path, credential, user, or protected content.
- Use JSON, deployed HTTPS, safe cache headers, and applicable abuse/rate bounds.

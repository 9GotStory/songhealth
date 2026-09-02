# Delivery 002 Bounded-Behavior Verification — Gate 07 Corrective Rework (T058)

Verification that representative detail, bounded-list continuation
(including all-ineligible windows), Preview, and binary requests respect the
server candidate/evaluation bounds, avoid deep OFFSET, unbounded scans, and
N+1 projection work, and enforce the reconciled Basic Page reference
boundary of FR-031 (tasks.md T058, regenerated for the G07-B01–B02
candidate). Recorded by the DEV Executor; independent review is Codex/Human
owned.

**No numeric performance target is invented here.** The only numbers cited
are the accepted, pinned server constants from the authorized implementation
and the observed counts of the disposable local verification profile. The
environment is local-only; nothing asserts Production capacity, and SC-009
stays `DEFERRED-EVIDENCE-GATE`.

- **Authority:** `c51ee2b6…` (FR-031); **Routing base:** `25df579…`;
  **Candidate:** branch `agent/claude-developer/g07r1`.
- **Method:** (a) source inspection of the corrected query, projection,
  Preview, and write paths; (b) the FR-031 suites added to the accepted test
  files (write boundary, detail/listing/Preview projection, order/dedup,
  query-count instrumentation — all passing, see the acceptance matrix §1);
  (c) live representative probes against the loopback runtime.

## 1. Listing candidate/evaluation bounds remain intact

`EligibleResourceQuery` is unchanged by this correction: `DEFAULT_PER_PAGE
20` / `MAX_PER_PAGE 100` (oversized requests are invalid input), the hard
`MAX_CANDIDATES_PER_REQUEST 200` evaluation budget, ONE keyset fetch of
`SCAN_BATCH_SIZE 201` per request (budget + one-row lookahead — `hasMore`
needs no COUNT query), `hasMore`-preserving empty all-ineligible windows,
and versioned expiring opaque cursors. **No SQL OFFSET exists anywhere in
the plugin**; candidates advance strictly by `public_id` keyset windows.

## 2. FR-031 reference boundary (the G07-B01 correction)

### Server-owned budget and raw-count preflight

`FoundationTypes::MAX_RAW_DOCUMENT_REFERENCES = 100`. One detail, listing,
or Preview response counts the RAW stored reference entries of every
participating Basic Page — per record and combined — BEFORE any reference
iteration or normalization (`ReferenceProjection::for_posts()` /
`record_within_budget()`). Over-budget state is never iterated: the
projection context short-circuits, and the callers fail the whole response.

### Whole-response bounded safe failure

- **Detail:** over-bound stored state → the whole response is the bounded
  `songhealth_unavailable` 500 class; no partial DTO, no truncation, no
  count, no implied completeness (`PublicRestContractTest`, live probe §5).
- **Listing:** the combined raw count of all participating Basic Pages is
  preflighted before ANY item is projected; above the budget the WHOLE
  envelope is the bounded 500 class — no earlier item is emitted as partial
  success (`PublicRestContractTest`: exactly-100 combined serves normally,
  101 fails whole).
- **Preview:** an over-bound candidate set fails the whole projection
  through the same generic bounded 5xx class with the Preview
  confidentiality headers unchanged (`PreviewContractTest`).
- The projector additionally fails closed (`null`) for any caller that
  skipped the preflight; stored over-bound data is never repaired or
  truncated in place.

### Authorized writes

`AdminExperience::save_bounded_fields` counts the RAW submitted reference
lines before any normalization and before ANY field of the submission is
written: 100 raw lines are accepted (normalization/dedup semantics
unchanged), 101 are refused atomically with the previous stored set — and
every other bounded field — preserved. Proven by
`AdminExperienceContractTest`: at-bound acceptance, over-bound refusal,
previous-value preservation, and a 101-raw-line submission whose
normalization would collapse below the budget still refused (duplicates
cannot bypass the pre-normalization work bound).

## 3. Set-based resolution and query maxima (no per-reference fan-out)

Per response, reference resolution performs AT MOST:

- **ONE set-based Public ID mapping query** — `PublicIdRegistry::mappings_for()`
  (`WHERE public_id IN (…)`; syntax-validated identifiers only; retrieval
  only, every decision left to callers);
- **ONE set-based referenced-post load** — `_prime_post_caches()` over the
  mapped Document Resources plus the attachment posts their publication
  validity reads (a pure `WHERE ID IN (…)` retrieval with no status or type
  pre-decision), after one set-based `update_meta_cache()` over the
  documents makes the attachment references known;
- **request-local caches** — the raw per-page entries, the resolved mapping
  rows (including known absences), the primed posts, and the applicable meta
  are all held response-locally; no persistent cache or generalized
  subsystem exists.

The unchanged `PublicEligibility` decision re-verifies the live one-to-one
identity of each candidate itself; to keep even that authority's reads
within the fixed response shape, the evaluation runs inside
`PublicIdRegistry::with_read_cache()` — a response-scoped read bracket
primed from the ONE set query, ALWAYS removed when the bracket ends. It
serves rows exactly as the database returned them and decides nothing.

### Instrumented proof (`PublicProjectorTest`, deterministic query capture via the wpdb `query` filter)

| Query classification | 1 reference | 25 references |
| --- | --- | --- |
| set-based mapping queries (`public_id IN`) | 1 | 1 |
| single-key registry lookups (`public_id =`) | ≤1 (the parent page's own identity) | **identical** |
| set-based referenced-post loads (`posts WHERE ID IN`) | 1 | 1 |
| single-post loads (`posts WHERE ID =`) | 0 | 0 |
| single-row metadata queries for referenced rows (`postmeta WHERE post_id = <ref>`) | 0 | 0 |

The counts are FLAT in the reference count — the fixed response shape FR-031
requires; elapsed time is never used as proof.

## 4. Eligibility authority, order, and deduplication

Set-based loading is retrieval only. Every emitted reference passes the
UNCHANGED current `PublicEligibility::is_eligible()` decision for its own
loaded post (type re-proven from the post, never trusted from the registry
row alone); unknown, wrong-type, withdrawn, ineligible, and tombstoned
references are omitted entirely, and an eligible Basic Page never elevates
them. Stored order is preserved and duplicates deduplicate in stored order
within the budget — pinned at exactly 100 raw entries with duplicates, an
ineligible reference, and an unknown shape (`PublicRestContractTest`).

## 5. Live representative observations (loopback runtime)

```text
GET /wp-json/songhealth/v1/resources?type=basic-page&perPage=1 continuation walk
  → 7 pages, 7 distinct Public IDs, 0 repeats, hasMore=false at the end
GET …&perPage=100  → the bounded page of every eligible fixture (clamped, no deepening)
GET …&perPage=9999 → 400 rest_invalid_param (invalid input, never silently honored)
GET /wp-json/songhealth/v1/resources/basic-page/<draft public id> → 404 neutral

Over-bound observation fixture (seeded through the creation service, 101 distinct
raw references — the legacy/bypassed persisted shape, removed after the probe):
GET /wp-json/songhealth/v1/resources/basic-page/<over-bound id>
  → 500 {"code":"songhealth_unavailable","message":"Unavailable.","data":{"status":500}}
GET /wp-json/songhealth/v1/resources?type=basic-page&perPage=20   (it participates)
  → 500 songhealth_unavailable (whole listing; no partial items)
GET /wp-json/songhealth/v1/documents/<eligible>/binary → 200 application/pdf, private,no-store
GET /wp-json/songhealth/v1/preview/documents/<draft>/binary (anonymous) → 404 neutral
```

## 6. Conclusion

Detail, bounded-list continuation (including all-ineligible windows),
Preview, and binary requests respect the accepted server
candidate/evaluation bounds; the listing layer remains keyset-only with no
OFFSET and one bounded fetch; and Basic Page reference work is now bounded
to the reconciled response budget with raw-count preflight, fixed set-based
mapping/post query shape, no per-reference database fan-out, unchanged
eligibility authority, and whole-response failure for any over-bound
detail/list/Preview. Observations are recorded against the disposable local
profile without inventing any numeric performance target.

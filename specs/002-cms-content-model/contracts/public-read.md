# Public Read and Shared-Source Contract

**Phase 1 design for Independent Review.** No public routes/templates, external-consumer API or
application implementation is introduced. This contract is the visibility/reuse boundary for
native model consumers and later public-page work. See [data-model.md](../data-model.md) and
[native-editorial.md](native-editorial.md).

## Native Reads

Keep the existing single `_emdash` live registration. Server-side consumers use native
`getEmDashCollection`, `getEmDashEntry` and `getEmDashReferences` from `emdash`, including only needed
reference fields and native pagination. They return native entries/error/cache hints; honor errors
and pagination rather than presenting an error as an empty successful listing.

Ordinary public request context reads published content and live selections. Authorized signed
preview/edit context may read pending data/selections. Unauthenticated query parameters alone do
not grant preview. Privileged `ctx.content.get` and administrative REST snapshots are not anonymous
public read APIs. Native subscriber/read-only REST behavior can additionally verify published-only
reference hydration, but does not substitute for the native public-query integration scenario.

## Shared Source and Missing Targets

- The same native Document identity/file selection is reused from Announcement, Service, Report
  and applicable About prose. Raw images do not require a semantic Document or second Media kind.
- Unpublished/trashed/unavailable linked content is omitted by the public read path; it must not
  fall back to a draft or privileged snapshot. Missing files produce safe unavailable state rather
  than content from another source or an unverified successful download.
- Shared media replacement/metadata edits may affect current consumers immediately. No immutable
  bytes, preserved historical evidence, availability-at-commit guarantee, cascade-prevention rule
  or target-removal veto is inferred. Native media is public-publishable, not confidential storage.
- Current Personnel/Organization fields and native classification metadata follow the documented
  current-state boundaries. Service/facility reciprocal reads use one native relation/identity;
  physical location remains distinct from coverage Area. Official code preservation is an inventory/
  editor verification obligation, not an immutable-history subsystem.

The consumer handles native pagination/error/not-found outcomes. Relation hydration is opt-in;
unrequested references remain absent. Follow native cache hints when a later cached consumer is
built, without adding a Songhealth cache/search projection to this feature.

## Verification Boundary

Future model integration tests exercise the native helpers within the Astro runtime with public
versus authorized preview context, including a published parent and unavailable linked target.
These can be test-harness consumers; no new production route is needed. The foundation marker test
alone does not establish these model-read outcomes. Staff tests also verify current shared-source
reuse and safe errors; later public-page implementation owns actual unavailable-file presentation.

D-ITA structured yearly evidence and D-REF historical/availability/removal enforcement are not
fixtures counted as V1 PASS. Legacy ITA URLs remain governed by their separate disposition; this
feature creates no ITA route or migration/cutover action. Future consumers must not silently
reintroduce a generic-page ITA replacement or confidential data.

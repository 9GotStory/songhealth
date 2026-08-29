# Protected Document Binary Delivery Contract

Anonymous route: `GET /wp-json/songhealth/v1/documents/{publicId}/binary`.

The route identifies the owning Document Resource by Public ID and never reveals attachment ID,
physical path, original upload URL, or filename as identity.

## Decision order

1. Validate Public ID syntax.
2. Resolve one Document Resource by immutable ID.
3. Evaluate that Document Resource's own current Songhealth public eligibility.
4. Only if eligible, validate protected attachment relationship and safe delivery metadata.
5. Stream with safe content type/disposition, anti-sniffing, tested range/size behavior, and abuse
   controls.

Unknown, ineligible, missing/invalid attachment, and unauthorized paths fail closed with neutral
behavior and no lifecycle/existence/storage/authorization detail.

## Invariants

- Storage existence is not delivery eligibility.
- Uploaded/Draft/Hidden/unpublished/withdrawn/ineligible resources cannot deliver anonymously.
- Basic Page or any reference never elevates Document Resource eligibility.
- Known/guessed/bookmarked/retained/prior-success URLs are re-evaluated every request; loss of current
  eligibility revokes subsequent delivery.
- No direct public upload/attachment URL or redirect bypasses this route.
- Eligibility caches cannot authorize; baseline response caching is conservative/non-shared.
- Preview binary access is separate, authenticated, bound to Preview, and never changes anonymous
  eligibility.

## Hosting condition

Prefer storage outside public document root. If the actual Bangmod account cannot support it, use a
denied protected upload location only after direct account/server tests prove all ordinary, encoded,
alternate-host, and attachment paths blocked. Otherwise return to Plan/security review; a public
uploads URL is not an acceptable fallback.

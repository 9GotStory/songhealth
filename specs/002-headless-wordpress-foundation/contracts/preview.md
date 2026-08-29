# Authenticated React Preview Boundary

Preview renders candidate Basic Page or Document Resource state through React inside the current
WordPress staff authorization boundary.

## Initiation

1. Authenticated staff invokes Preview from the Songhealth-configured `wp-admin` record.
2. `songhealth-core` checks current active user, role/capability, scope, object, lifecycle, and
   candidate access server-side.
3. It issues a short-lived, single-purpose signed opaque grant bound to user, resource type/Public ID,
   candidate revision, expiry, and `preview` audience, then opens React. The grant contains no content,
   credential, or administrator secret.

## Retrieval

`GET /wp-json/songhealth/v1/preview/{resourceType}/{publicId}`

The request carries the grant and current same-site WordPress session. REST nonce/origin controls
defend cookie-authenticated requests from CSRF; they are not authorization. Every request freshly
validates grant signature/expiry/purpose/audience/resource/revision/user binding, authenticated active
session, current capability/scope/object access, and candidate availability. Logout, disablement,
demotion, expiry, or scope loss denies the next request. Failure is default-deny and neutral.

## Isolation

- Explicit Preview projector contains only candidate fields needed by the shared React renderer.
- `Cache-Control: private, no-store`; no shared/service-worker persistence.
- `X-Robots-Tag: noindex, nofollow` plus page metadata.
- Exclude from public routes/list/search/sitemap/feed/canonical links, crawler discovery, and content-
  capturing analytics.
- UI labels it non-public/read-only. Preview never publishes, schedules, changes lifecycle, or makes
  private media public; Preview media uses authenticated lifecycle-aware delivery.

No anonymous/shareable token, frontend-only role check, public `preview=true`, parallel identity
store, or administrator credential is permitted.

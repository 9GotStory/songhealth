---
status: accepted
---

# V1 serves original CMS images in production

Public pages render CMS images through EmDash's Image component, which hands them to Astro's image
service. In EmDash 1.1.0, Astro may transform only the media sources EmDash authorises
(`node_modules/emdash/src/astro/integration/index.ts`, `buildImageRemotePatterns`):

- **Under `astro dev`**, which the development runtime runs, all EmDash media is authorised. Sharp
  serves a rendition near the width that `sizes` asks for.
- **In a production build**, a source is authorised only when the site URL is known at build time.
  Songhealth's build knows no site URL, because `10` §20.1 keeps every environment value at runtime.
  Astro 7.3.5 therefore returns the original media URL unchanged
  (`node_modules/astro/dist/assets/services/service.js`, `getURL`), and the page never asks sharp
  for a rendition.

The page still lays the image out at its declared width and height. The download is the original
file, though, however large.

The Product Owner accepted original files for V1 on 2026-10-29 (#54). The production container
confirmed the behaviour on 2026-11-01 (#67 comment 6558376075). At a 1440 px viewport, a News
picture declared 1200 × 750 is laid out at 768 × 480, the same box as on the development runtime.
The page downloads the original 31,700-byte PNG, where the development runtime serves a 2,866-byte
WebP rendition. Large originals, such as phone photos or the WordPress import's pictures, therefore
weigh on every list and card that shows them. Asked again before deployment, on 2026-11-01, the
Product Owner kept original files for V1, with staff guidance on picture size. The import and the
deployment both need the Product Owner's approval, so the revisit below comes before either.

## Considered options

- **Build-time site URL.** Authorises the production origin and lets sharp serve renditions, but
  bakes an environment value into the image, which `10` §20.1 rules out.
- **Resizing at upload.** A custom media pipeline, which the platform-native principle rules out
  without a demonstrated gap.
- **A host-agnostic media remote pattern.** The pattern `{ pathname: "/_emdash/api/media/file/**" }`
  in `astro.config.mjs`'s `image.remotePatterns` would let pages ask for renditions with no
  build-time site URL. EmDash's wrapped image endpoint reads media from storage by key and never
  fetches the URL (`node_modules/emdash/src/astro/image-endpoint.ts`), and on the production
  container it already answers such a request with a WebP rendition. EmDash registers this pattern
  under `astro dev` only (`docs/agents/emdash-1.1.0.md`, Media). With it in production, an `href`
  whose key EmDash rejects, or any media `href` while storage is unavailable, would go to Astro
  7.3.5's stock endpoint. That endpoint would fetch the path from any host the pattern allows, which
  is every host (`node_modules/astro/dist/assets/endpoint/generic.js`, `loadImage.js`). That
  residual server-side request surface makes this option a security exception, so it waits for the
  revisit below.

## Consequences

- Image evidence from the development runtime shows renditions that production does not serve.
  Image sizing in production is checked through a production container with
  `scripts/production-image-check.sh`, as #67 did.
- Staff guidance asks for pictures uploaded at a sensible size.
- Revisit this decision before the WordPress import brings its pictures or before deployment,
  whichever comes first, or when page weight at real content becomes a problem. The revisit starts
  from the host-agnostic pattern above and its security check.

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
  Astro therefore returns the original media URL unchanged
  (`node_modules/astro/dist/assets/services/service.js`, `getURL`), and sharp is never used.

The page still lays the image out at its declared width and height. The download is the original
file, though, however large.

The Product Owner accepted original files for V1 on 2026-10-29 (#54).

## Considered options

- **Build-time site URL.** Authorises the production origin and lets sharp serve renditions, but
  bakes an environment value into the image, which `10` §20.1 rules out.
- **Resizing at upload.** A custom media pipeline, which the platform-native principle rules out
  without a demonstrated gap.

## Consequences

- Image evidence from the development runtime shows renditions that production does not serve.
  Check image sizing in production through the production container, which #67 builds.
- Staff guidance asks for pictures uploaded at a sensible size.
- Revisit this decision before deployment (#67), or when page weight at real content becomes a
  problem.

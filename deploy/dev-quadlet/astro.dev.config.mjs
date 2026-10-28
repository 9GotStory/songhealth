// Songhealth development runtime — the dev server's Astro configuration (Feature 002 T037).
//
// The canonical astro.config.mjs (imported unchanged, so its fail-closed input validation
// runs as usual) plus the development-only T021 public-read fixture integration, which
// injects /__feature002/public-reads in `astro dev` only and refuses every request without
// the route token. Only scripts/dev-runtime-entrypoint.sh uses this file, inside
// songhealth-qdev-app, where /src is the runtime checkout. Production builds use
// astro.config.mjs alone: deploy/Containerfile copies neither deploy/dev-quadlet/ nor
// tests/browser/. Modeled on the reviewed UID-1001 development configuration (T021 Gate A
// bundle, config/astro.dev.config.mjs); strictPort keeps the dev server on its one port.

import foundation from "/src/astro.config.mjs";
import { cmsPublicReadsIntegration } from "/src/tests/browser/fixtures/cms-public-reads.integration.mjs";

export default {
  ...foundation,
  root: "/src",
  vite: {
    ...foundation.vite,
    server: { ...foundation.vite?.server, strictPort: true },
  },
  integrations: [...(foundation.integrations ?? []), cmsPublicReadsIntegration()],
};

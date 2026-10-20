// External development configuration: the reviewed application tree stays intact.
import foundation from '/app/astro.config.mjs';
import { cmsPublicReadsIntegration } from '/app/tests/browser/fixtures/cms-public-reads.integration.mjs';
export default {
  ...foundation,
  root: '/app',
  vite: {
    ...foundation.vite,
    server: { ...foundation.vite?.server, strictPort: true },
  },
  integrations: [...(foundation.integrations ?? []), cmsPublicReadsIntegration()],
};

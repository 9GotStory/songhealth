// Canonical Songhealth Astro SSR application configuration (Feature 001, T004).
//
// One Astro + EmDash platform per docs/website-modernization-docs/current/10-system-blueprint.md
// (including §20.1 Native Runtime Configuration Contract):
// - `output: "server"` with the official Node adapter in standalone mode (self-contained
//   Node entry; no separate host application server)
// - React integration (required by the native EmDash Admin)
// - EmDash with its native PostgreSQL adapter and native persistent local-media adapter
// - native core migrations: runtime "check" in production, "auto" in development
//
// No connection value is passed to the PostgreSQL adapter: the application runtime
// resolves its database natively from the PostgreSQL client inputs PGHOST, PGPORT,
// PGDATABASE, PGUSER, and PGPASSWORD at connection time, so no credential or
// environment-specific value is serialized into build artifacts or images. The native
// EmDash migration commands connect through EMDASH_MIGRATION_DATABASE_URL, named here
// via the adapter's supported migration environment-variable option; the migration
// manifest emitted by `astro build`/`astro sync` records that variable NAME only.
// Media storage is not runtime-configured: the native local-media adapter uses the
// stable application mount path ./media (ignored local directory in development; the
// persistent media volume maps to the same path in production).
//
// See .env.example for the documented external configuration names, including the
// public origin EMDASH_SITE_URL (read natively by EmDash at runtime), HOST/PORT for
// the application server, and EMDASH_ENCRYPTION_KEY. The empty version-1 seed is
// discovered at seed/seed.json.

import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { postgres } from "emdash/db";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    react(),
    emdash({
      database: postgres({
        migrationConnectionStringEnv: "EMDASH_MIGRATION_DATABASE_URL",
      }),
      storage: local({
        directory: "./media",
        baseUrl: "/_emdash/api/media/file",
      }),
      migrations: {
        runtime: "check",
        dev: "auto",
      },
    }),
  ],
});

// Canonical Songhealth Astro SSR application configuration (Feature 001, T004).
//
// One Astro + EmDash platform per docs/website-modernization-docs/current/10-system-blueprint.md:
// - `output: "server"` with the official Node adapter in standalone mode (self-contained
//   Node entry; no separate host application server)
// - React integration (required by the native EmDash Admin)
// - EmDash with its native PostgreSQL adapter and native persistent local-media adapter
// - native core migrations: runtime "check" in production, "auto" in development
//
// Environment-specific values are read from the runtime environment and stay external
// to the repository (see .env.example); no secret values are committed:
// - DATABASE_URL — secret-bearing PostgreSQL connection string
// - MEDIA_DIRECTORY — persistent media mount; "./media" is the development default
//   documented in .env.example and ignored by Git
//
// `astro build` / `astro sync` emits .emdash/migrations.json (Git-ignored) for the exact
// build; native `emdash migrate --status` / `emdash migrate` / `emdash migrate --check`
// consume that manifest. The empty version-1 seed is discovered at seed/seed.json.

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
        connectionString: process.env.DATABASE_URL,
      }),
      storage: local({
        directory: process.env.MEDIA_DIRECTORY ?? "./media",
        baseUrl: "/_emdash/api/media/file",
      }),
      migrations: {
        runtime: "check",
        dev: "auto",
      },
    }),
  ],
});

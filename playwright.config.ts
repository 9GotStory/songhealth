// T010 — Playwright configuration for the Feature 001 focused browser smoke
// checks (minimum public SSR marker + native EmDash Admin availability).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T010 (graph: T008 -> T010 -> T011)
// - specs/001-platform-foundation/plan.md ("Testing": Playwright 1.63.0 for
//   focused public/Admin browser smoke checks; planned tests/browser
//   structure; "Runtime verification and readiness")
// - specs/001-platform-foundation/research.md §11 (Testing Approach: browser
//   automation for exactly the two browser surfaces, not every check)
// - specs/001-platform-foundation/quickstart.md §2 (`npm run test:browser`)
// - docs/website-modernization-docs/current/10-system-blueprint.md §21
//   (test Songhealth configuration and assumptions, not EmDash internals)
//
// The suite targets the externally configured/running Songhealth application:
// this configuration never starts the application, its database, or any other
// server (no `webServer`). The maintainer starts the one Astro + EmDash
// platform externally per quickstart §1 and points the suite at it. This keeps
// the browser checks a pure availability/marker verification of the running
// integration surface and avoids duplicating the startup/migration gates owned
// by T013/T015.
//
// The base URL comes from the PLAYWRIGHT_BASE_URL environment variable when
// set, otherwise from the documented development origin (HOST=127.0.0.1,
// PORT=4321 in .env.example). That variable is test-runner plumbing, not an
// application runtime configuration name (10-system-blueprint.md §20.1), so it
// is intentionally not added to .env.example. This file reads no credentials
// and no secret values.

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "./tests/browser",
  // Console-only reporting keeps the suite evidence in command output; the
  // artifact output directory is bounded to the already-ignored .tmp/ scratch
  // path (T003 repository hygiene) so a run leaves no untracked directories.
  reporter: [["list"]],
  outputDir: "./.tmp/playwright-results",
  use: {
    baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

// Playwright configuration for the browser suites (Feature 001 T010; README "Development runtime").
//
// The suites run against an application that is already running and never start one: the base
// URL is PLAYWRIGHT_BASE_URL, which scripts/dev-runtime-env.sh sets to the development runtime,
// else http://localhost:4321. Reporting stays in the console, and artifacts go to the ignored
// .tmp/. This file reads no credential.
//
// One worker: the suites share one runtime, and one of them returns the runtime's content to draft
// while it runs (tests/browser/public-homepage.spec.ts), so suites side by side fail each other
// and leave fixtures behind (#241 retro: 9 failures and two entries left by a run without it).
//
// Every request carries a songhealth-unknown- referrer. EmDash's 404 log keeps a miss's referrer
// beside its path (docs/agents/emdash-1.1.0.md "Native API for tests"), so
// scripts/dev-runtime-residue.sh counts every miss a test causes as the tests' own: one whose path
// cannot carry the mark, such as a fiscal year's /ita/2404, and a red run's request for a route
// not built yet (#124 retro). Chromium sends the header on a navigation and on a click (checked on
// the development runtime, 2026-11-02), and EmDash bases no access decision on a referrer (the same
// facts file).

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4321";

/** The referrer of every test request; scripts/capture-admin.ts sends it too. */
export const SYNTHETIC_REFERRER = "http://songhealth-unknown-referrer.invalid/";

export default defineConfig({
  testDir: "./tests/browser",
  // The second reporter names the tests that passed close to their timeout (#247 retro).
  reporter: [["list"], ["./tests/browser/near-timeout-reporter.ts"]],
  outputDir: "./.tmp/playwright-results",
  workers: 1,
  use: {
    baseURL,
    extraHTTPHeaders: { referer: SYNTHETIC_REFERRER },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

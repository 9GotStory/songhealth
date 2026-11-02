// Playwright configuration for the browser suites (Feature 001 T010; README "Development runtime").
//
// The suites run against an application that is already running and never start one: the base
// URL is PLAYWRIGHT_BASE_URL, which scripts/dev-runtime-env.sh sets to the development runtime,
// else http://localhost:4321. Reporting stays in the console, and artifacts go to the ignored
// .tmp/. This file reads no credential.
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

export default defineConfig({
  testDir: "./tests/browser",
  reporter: [["list"]],
  outputDir: "./.tmp/playwright-results",
  use: {
    baseURL,
    extraHTTPHeaders: { referer: "http://songhealth-unknown-referrer.invalid/" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

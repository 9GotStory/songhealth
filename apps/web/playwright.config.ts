import { defineConfig, devices } from "@playwright/test";

// Browser test project (Delivery 002, T004) for the selectively reused React
// public application. Specs live in apps/web/tests/e2e and are owned by their
// authoring tasks (T024 et seq.).
//
// Deliberately minimal: the served-origin wiring (webServer/baseURL) is added
// by the task that owns the application runtime, so no infrastructure or
// dev-server baseline is introduced speculatively here.
export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    {
      name: "browser",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

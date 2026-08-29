/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Public workspace build configuration. The release-shaped custom server entry
// (apps/web/server.ts) and its SSR build input are added by a later task; this
// file only wires the official React Router Framework Mode Vite plugin.
//
// Test projects (Delivery 002, T004): the selectively reused React application
// exposes distinct unit and contract projects in the repository's existing
// Vitest runner. Browser tests are owned by playwright.config.ts. Project
// selection: `npx vitest run --project unit` / `--project contract` from
// apps/web; suites without tests yet (contract, T023) stay empty until their
// authoring task.
export default defineConfig({
  plugins: [reactRouter()],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "app/**/*.test.{ts,tsx}",
            "server.test.ts",
            "tests/unit/**/*.test.{ts,tsx}",
          ],
        },
      },
      {
        test: {
          name: "contract",
          environment: "node",
          include: ["tests/contract/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});

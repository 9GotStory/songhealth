// @ts-check
// Baseline ESLint flat configuration (T006).
//
// Scope: recommended JavaScript and TypeScript parsing/static rules for the approved
// .js/.mjs/.cjs/.ts/.tsx surfaces, with bounded file patterns and dependency/generated
// output ignored. Environment globals are scoped to their real Node or browser ownership
// rather than enabled repository-wide.
//
// Out of scope for this file (owned by later tasks):
//   - T065: deterministic import-direction and architecture-boundary rules
//   - T066: command wiring (npm run check, etc.)
//   - T008: dependency resolution and the lockfile (ESLint is not installed before then)
//
// No type-aware project-service expansion, custom architecture plugin, formatting
// framework, or shared config package is introduced here.

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig(
  // Global ignores: dependencies and generated/build output are never linted.
  {
    ignores: [
      "node_modules/",
      "**/node_modules/**",
      "dist/",
      "build/",
      "**/dist/**",
      "**/build/**",
      "**/.react-router/**",
      "package-lock.json",
    ],
  },

  // Baseline recommended JavaScript rules for the approved JS surfaces
  // (application, configuration, script, and test inputs).
  {
    files: [
      "apps/**/*.js",
      "apps/**/*.mjs",
      "apps/**/*.cjs",
      "scripts/**/*.js",
      "scripts/**/*.mjs",
      "scripts/**/*.cjs",
      "tests/**/*.js",
      "tests/**/*.mjs",
      "tests/**/*.cjs",
      "*.js",
      "*.mjs",
      "*.cjs",
    ],
    plugins: { js },
    extends: ["js/recommended"],
  },

  // Baseline recommended rules for the approved TS/TSX surfaces: the core @eslint/js
  // recommended rules plus the typescript-eslint recommended rules (current official
  // baseline, without type-aware project-service expansion).
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "scripts/**/*.ts", "tests/**/*.ts", "*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Node-owned globals: the server boundary, root operation/security scripts, root
  // configuration files, and the Node-side build/server entry points that live inside
  // the Public and Admin workspaces (Vite/React Router configs and the web server entry).
  {
    files: [
      "apps/server/**/*.js",
      "apps/server/**/*.mjs",
      "apps/server/**/*.cjs",
      "apps/server/**/*.ts",
      "apps/server/**/*.tsx",
      "apps/web/server.ts",
      "apps/web/vite.config.ts",
      "apps/web/react-router.config.ts",
      "apps/admin/vite.config.ts",
      "scripts/**/*.js",
      "scripts/**/*.mjs",
      "scripts/**/*.cjs",
      "scripts/**/*.ts",
      "*.js",
      "*.mjs",
      "*.cjs",
      "*.ts",
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Browser-owned globals: the Public and Admin presentation source.
  {
    files: ["apps/web/app/**/*", "apps/admin/src/**/*"],
    languageOptions: { globals: { ...globals.browser } },
  },
);

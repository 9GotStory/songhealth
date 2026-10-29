// Type-check the .astro files: `astro check` (@astrojs/check 0.9.10), which `npm run typecheck`
// runs after tsc, because tsc reads no .astro file.
//
//   node scripts/check-astro.mjs
//
// astro.config.mjs validates the runtime inputs whenever Astro loads it, so the check runs with
// the build-only placeholders that deploy/Containerfile and the CI build use: not secrets, not
// routable, and the check reaches no database or network. It reads the files tsconfig.json
// includes; the accepted Feature 002 T021 fixture route is excluded there, unchanged.

import { spawnSync } from "node:child_process";

const BUILD_ONLY_INPUTS = {
	PGHOST: "build.internal",
	PGPORT: "5432",
	PGDATABASE: "build",
	PGUSER: "build",
	PGPASSWORD: "build-time-placeholder-not-a-secret",
	EMDASH_MIGRATION_DATABASE_URL:
		"postgresql://build:build-time-placeholder-not-a-secret@build.internal:5432/build",
	EMDASH_SITE_URL: "http://build.invalid",
	HOST: "127.0.0.1",
	PORT: "4321",
	EMDASH_ENCRYPTION_KEY: "build-time-placeholder-not-a-secret",
	ASTRO_TELEMETRY_DISABLED: "1",
};

const result = spawnSync("npx", ["--no-install", "astro", "check"], {
	stdio: "inherit",
	env: { ...process.env, ...BUILD_ONLY_INPUTS },
});
process.exit(result.status ?? 1);

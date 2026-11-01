// Run an Astro command with the build-only inputs: `astro check` in `npm run typecheck`, and
// `astro build` in `npm run build:check`, which CI runs.
//
//   node scripts/with-build-inputs.mjs astro build
//
// astro.config.mjs validates the runtime inputs whenever Astro loads it, so these commands need
// values for them. These are the build-only placeholders: not secrets, not routable, and the
// command reaches no database or network. This file is their one source for local runs and CI;
// deploy/Containerfile sets the same values inside the image build. `astro check` reads the files
// tsconfig.json includes; the accepted Feature 002 T021 fixture route is excluded there, unchanged.

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

const command = process.argv.slice(2);
if (command.length === 0) {
	console.error("usage: node scripts/with-build-inputs.mjs <command> [args...]");
	process.exit(2);
}
const result = spawnSync("npx", ["--no-install", ...command], {
	stdio: "inherit",
	env: { ...process.env, ...BUILD_ONLY_INPUTS },
});
process.exit(result.status ?? 1);

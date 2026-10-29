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
//
// T008 adds the fail-fast runtime configuration validation directly below the
// imports: the approved native input set must be present and well formed, and the
// PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL must agree on the intended
// database's non-secret identity (host, port, database, user).

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { postgres } from "emdash/db";

// Fail-fast runtime configuration validation (Feature 001, T008). This module is
// the canonical configuration boundary — every `astro dev`, `astro build`,
// `astro sync`, and built-server start evaluates it — so the required inputs are
// validated here and the load fails closed listing every detected problem.
// Errors identify field/component names only and never echo a configured value,
// password, full URL, or secret; nothing is logged on success. The identity check
// compares the non-secret PostgreSQL identity components (host, port, database,
// user) only, never passwords.

const POSTGRESQL_URL_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
// A migration URL may omit the port; it then targets the PostgreSQL default,
// which is the port identity the PG* inputs must agree with.
const POSTGRESQL_DEFAULT_PORT = "5432";
// The native PostgreSQL client consumes the migration URL through
// pg-connection-string, which applies query options to the connection config
// and lets the host, port, and user query keys override the URL identity this
// validation compares (database is included conservatively; libpq-style keys
// are matched case-insensitively). Any such key fails closed; unrelated
// native options such as SSL settings are unaffected.
const IDENTITY_OVERRIDE_QUERY_KEYS = new Set(["host", "port", "user", "database"]);

const REQUIRED_INPUT_NAMES = [
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "EMDASH_MIGRATION_DATABASE_URL",
  "EMDASH_SITE_URL",
  "HOST",
  "PORT",
  "EMDASH_ENCRYPTION_KEY",
];

function isMissingInput(value) {
  return typeof value !== "string" || value.trim() === "";
}

function isTcpPort(value) {
  return /^[0-9]+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}

function databaseNameFromUrl(url) {
  return url.pathname.replace(/^\//, "");
}

// A public origin is exactly scheme://host[:port]: an absolute http:// or
// https:// URL with a non-empty host and no userinfo, path, query, or
// fragment (.env.example documents the form with no trailing slash).
// Acceptance requires the unmodified input to equal its own canonical WHATWG
// origin serialization (url.origin), which contains exactly that form and
// nothing else — so a missing, doubled, or backslashed authority separator,
// surrounding or control whitespace, userinfo, path, query, fragment, or
// trailing slash (anything the parser would silently normalize away) makes
// the input differ from its origin form and fails closed.
function parseAbsoluteHttpOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const isOrigin =
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.hostname !== "" &&
    value === url.origin;
  return isOrigin ? url : null;
}

function validateRuntimeConfiguration(env) {
  const problems = [];
  const missing = REQUIRED_INPUT_NAMES.filter((name) => isMissingInput(env[name]));
  for (const name of missing) {
    problems.push(`missing required input ${name}`);
  }

  for (const name of ["PGPORT", "PORT"]) {
    if (!missing.includes(name) && !isTcpPort(env[name])) {
      problems.push(`input ${name} must be a TCP port number from 1 to 65535`);
    }
  }

  if (
    !missing.includes("EMDASH_SITE_URL") &&
    parseAbsoluteHttpOrigin(env.EMDASH_SITE_URL) === null
  ) {
    problems.push(
      "input EMDASH_SITE_URL must be an absolute http:// or https:// origin (scheme, host, optional port only: no userinfo, path, query, or fragment)",
    );
  }

  let migrationUrl = null;
  if (!missing.includes("EMDASH_MIGRATION_DATABASE_URL")) {
    try {
      migrationUrl = new URL(env.EMDASH_MIGRATION_DATABASE_URL);
    } catch {
      migrationUrl = null;
    }
    if (migrationUrl === null || !POSTGRESQL_URL_PROTOCOLS.has(migrationUrl.protocol)) {
      problems.push(
        "input EMDASH_MIGRATION_DATABASE_URL must be a PostgreSQL connection URL (scheme postgresql:// or postgres://)",
      );
    } else {
      if (migrationUrl.username === "" || databaseNameFromUrl(migrationUrl) === "") {
        problems.push(
          "input EMDASH_MIGRATION_DATABASE_URL must include its user and database identity components",
        );
      }
      if (
        [...migrationUrl.searchParams.keys()].some((key) =>
          IDENTITY_OVERRIDE_QUERY_KEYS.has(key.toLowerCase()),
        )
      ) {
        problems.push(
          "input EMDASH_MIGRATION_DATABASE_URL must not carry connection options that can override its PostgreSQL identity components (host, port, user, database)",
        );
      }
    }
  }

  const identityComparable =
    migrationUrl !== null &&
    POSTGRESQL_URL_PROTOCOLS.has(migrationUrl.protocol) &&
    migrationUrl.username !== "" &&
    databaseNameFromUrl(migrationUrl) !== "" &&
    ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER"].every((name) => !missing.includes(name));
  if (identityComparable) {
    const urlPort = migrationUrl.port === "" ? POSTGRESQL_DEFAULT_PORT : migrationUrl.port;
    if (env.PGHOST.toLowerCase() !== migrationUrl.hostname) {
      problems.push("host identity disagrees between PGHOST and EMDASH_MIGRATION_DATABASE_URL");
    }
    if (env.PGPORT !== urlPort) {
      problems.push("port identity disagrees between PGPORT and EMDASH_MIGRATION_DATABASE_URL");
    }
    if (env.PGDATABASE !== databaseNameFromUrl(migrationUrl)) {
      problems.push(
        "database identity disagrees between PGDATABASE and EMDASH_MIGRATION_DATABASE_URL",
      );
    }
    if (env.PGUSER !== migrationUrl.username) {
      problems.push("user identity disagrees between PGUSER and EMDASH_MIGRATION_DATABASE_URL");
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Songhealth runtime configuration is invalid (see .env.example): ${problems.join("; ")}`,
    );
  }
}

validateRuntimeConfiguration(process.env);

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Application server boundary (blueprint §20.1, T015 Human Gate): the
  // already-validated HOST and PORT inputs are consumed here through Astro's
  // native server configuration, so `astro dev`/`astro preview` bind exactly
  // the configured address instead of a default `localhost` resolution that
  // may resolve differently from the configured loopback boundary. The port
  // converts to the number Astro's native type requires. The built standalone
  // Node server keeps its own native runtime HOST/PORT override, so production
  // behavior is unchanged.
  server: {
    host: process.env.HOST,
    port: Number(process.env.PORT),
  },
  // Feature 003 (#52): `astro dev` serves public pages as citizens get them.
  // The dev toolbar would add its client scripts and overlay to every page and
  // annotate the server-rendered HTML (including the Feature 001 marker), so
  // the browser suites and Product Owner review would see a different page.
  // Production builds never include the toolbar.
  devToolbar: {
    enabled: false,
  },
  // Public presentation (ADR 0001): Tailwind CSS v4 through its official Vite
  // plugin. It generates CSS at build time and ships no client JavaScript; the
  // design tokens live in src/styles/global.css.
  vite: {
    plugins: [tailwindcss()],
  },
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

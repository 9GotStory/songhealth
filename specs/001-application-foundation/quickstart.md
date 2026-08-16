# Quickstart Validation: Application Foundation & Development Runtime

This guide defines runnable acceptance scenarios for the completed foundation. Commands are
repository contracts from [foundation-operations.md](contracts/foundation-operations.md). HTTP
responses follow [foundation-http.openapi.yaml](contracts/foundation-http.openapi.yaml), and
profile state follows [data-model.md](data-model.md).

## Prerequisites

1. Use a clean checkout on a supported workstation.
2. Install Node.js 24.x LTS with npm.
3. Install Podman and configure one Compose provider. Confirm `podman compose version` or the
   provider-specific equivalent succeeds.
4. Confirm the documented loopback ports are free.
5. Do not use Production credentials or Production data.

The Validation run excludes prerequisite download time from SC-001 and SC-003 timing.

## 1. Prepare a clean Development profile

```bash
npm ci
cp .env.development.example .env.development.local
npm run foundation:check
npm run dev:setup
```

Expected outcomes:

- the prerequisite check identifies any missing tool, Compose provider, unsafe value, or port
  conflict before application startup;
- only the Development database dependency is created in Podman;
- database access is bound to loopback and uses Development-only credentials;
- the named Development volume exists and migration status is `current`;
- no Product/domain schema, Production secret, or Production data is created;
- the procedure completes within 20 minutes, excluding prerequisite downloads.

## 2. Start and prove daily readiness

```bash
npm run dev:start
npm run dev:ready
```

`dev:ready` requests both health endpoints and prints the validated Public and Admin Development
URLs. Open those exact URLs; no undocumented port discovery is required.

Expected outcomes:

- liveness and readiness match the operational HTTP contract;
- the Public route returns meaningful server-rendered HTML before client JavaScript;
- the Admin route loads the separate CSR foundation shell;
- the route copy identifies only the current foundation boundary and does not implement Product
  navigation, authentication, editorial workflow, or domain behavior;
- running `npm run dev:start` again does not create duplicate processes, containers, networks, or
  volumes.

## 3. Prove Development persistence and explicit reset

```bash
npm run dev:stop
npm run dev:start
npm run dev:ready
DEV_DATABASE_ID_BEFORE="$(npm run --silent dev:database-id)"
npm run dev:restart
DEV_DATABASE_ID_AFTER_RESTART="$(npm run --silent dev:database-id)"
test "$DEV_DATABASE_ID_BEFORE" = "$DEV_DATABASE_ID_AFTER_RESTART"
```

Expected outcome: the opaque database instance identity is unchanged after routine stop/restart
because the Development named volume was preserved. The command is read-only and prints no
connection or infrastructure detail.

Then reset only the Development data:

```bash
npm run dev:stop
npm run dev:reset -- --confirm development
npm run dev:start
npm run dev:ready
DEV_DATABASE_ID_AFTER_RESET="$(npm run --silent dev:database-id)"
test "$DEV_DATABASE_ID_BEFORE" != "$DEV_DATABASE_ID_AFTER_RESET"
```

Expected outcomes:

- the database instance identity changed after reset and migration status is again `current`;
- only the exact Delivery-owned Development volume was replaced;
- an omitted or incorrect confirmation fails without changing any resource;
- repeating stop/reset/start remains predictable.

## 4. Prove fail-closed configuration

With the daily profile stopped, temporarily omit one required non-secret configuration key, then
attempt startup:

```bash
npm run dev:start
```

Expected outcomes:

- the command exits non-zero before the server listens or accepts work;
- output identifies `CONFIGURATION_INVALID` and, when safe, the missing key;
- output contains no secret value, database URL, SQL error, stack trace, filesystem path, or raw
  internal exception.

Restore the local configuration and repeat with one malformed value. The same failure guarantees
must hold.

## 5. Prove migration readiness is explicit

```bash
npm run db:status -- --profile development
npm run db:migrate -- --profile development
npm run db:status -- --profile development
```

Expected outcomes:

- `status` never applies a migration;
- `migrate` is explicit and returns one result per tracked migration;
- the final status is `current`;
- ordinary application startup never auto-runs pending migrations and cannot report ready while
  tracked migrations are pending.

This Delivery has no Product migration content; the check proves the migration mechanism and
database path only.

## 6. Run Production-like Verification independently

Daily Development may be stopped or running. Use a Verification-only configuration copied from
the committed example, then run:

```bash
cp .env.verification.example .env.verification.local
npm run verify:production-like
```

Expected outcomes within 10 minutes:

- a clean, isolated Verification project builds the release candidate;
- only Nginx is published to the host; application and database endpoints remain internal;
- migrations are applied explicitly before application readiness;
- the report has a distinct `PASS` or `FAIL` for build, configuration, migration, database,
  liveness, readiness, proxy, Public route, Admin route, server route, and isolation;
- forwarded host/protocol behavior is accepted only through the single Verification proxy hop;
- failures identify the contract with a safe reason code and return non-zero;
- the final report states that local success does not establish exact Bangmod/Plesk parity;
- pass or fail cleanup removes only Verification resources and leaves Development state unchanged.

## 7. Repeat from independently clean states

Perform the explicit Development reset and the complete Production-like Verification run twice:

```bash
npm run dev:stop
npm run dev:reset -- --confirm development
npm run dev:start
npm run dev:ready
npm run verify:production-like
npm run dev:stop
npm run dev:reset -- --confirm development
npm run dev:start
npm run dev:ready
npm run verify:production-like
```

Expected outcome: all acceptance scenarios and common foundation checks pass on two consecutive
runs without an undocumented corrective step, shared mutable data, duplicate resources, or an
ambiguous result.

## 8. Run common quality checks and stop

```bash
npm run check
npm run dev:stop
```

Expected outcomes:

- typecheck, lint/architecture, unit/integration, HTTP/render/proxy contract, and build checks have
  discoverable non-zero failure behavior;
- Development containers stop while the named volume remains;
- no task claims Staging/Production readiness or exact Production parity.

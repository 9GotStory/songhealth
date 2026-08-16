# Foundation Operations Contract

This contract defines the maintainer-facing entry points and profile safety rules. Script names are
stable repository interfaces; their internal implementation remains a later task.

## Prerequisites

- Node.js 24.x LTS with its supported npm CLI
- Podman with a configured Compose provider (`podman compose` must succeed)
- ability to bind the documented loopback ports
- a clean checkout and safe local configuration copied from the committed examples

Production credentials, Production data, a native database service, and a running daily profile are
not prerequisites.

## Commands

| Command | Contract |
|---|---|
| `npm ci` | Install exactly the lockfile dependency graph. |
| `npm run foundation:check` | Check Node/npm/Podman/Compose availability, required files, safe profile configuration, and port availability without starting services. |
| `npm run dev:setup` | Validate the Development profile, create/start only its database dependency, explicitly apply tracked migrations, and stop with an actionable non-zero result on failure. |
| `npm run dev:start` | Start the Development database if needed and the native server/Public/Admin development processes; repeated invocation must not create duplicate resources. |
| `npm run dev:ready` | Poll bounded readiness and route checks; return zero only when the whole daily foundation is ready. |
| `npm run dev:stop` | Stop native processes and the Development database container without removing its named volume. Repetition is safe. |
| `npm run dev:restart` | Perform the documented stop/start sequence and preserve Development data. |
| `npm run dev:reset -- --confirm development` | Stop the exact Development database, remove only the allowlisted Development volume, recreate it, and explicitly apply migrations. Missing/wrong confirmation fails without mutation. |
| `npm run dev:database-id` | Read and print one opaque Development database instance identifier so validation can compare identity across restart/reset. It is read-only and must not print a host, credential, version, path, or connection string. |
| `npm run db:status -- --profile development` | Report `current`, `pending`, or a safe failure code without applying migrations. |
| `npm run db:migrate -- --profile development` | Apply pending version-controlled migrations explicitly to the selected non-Production profile. |
| `npm run verify:production-like` | From a clean isolated Verification data state: build, start Nginx/application/database, apply migrations explicitly, wait for readiness, run all required checks, print one pass/fail per contract plus the parity statement, clean up only Verification resources, and return non-zero if any check fails. |
| `npm run check` | Run the common deterministic source checks (format/lint, typecheck, architecture checks, tests, and builds) and return non-zero on any failure. |

## Configuration examples

The repository provides separate `.env.development.example` and `.env.verification.example` files.
Actual local files are ignored by Git. Example values are non-secret placeholders and must never be
accepted as Production configuration.

Minimum logical keys:

| Key | Development | Verification | Safety rule |
|---|---|---|---|
| `APP_ENVIRONMENT` | `development` | `development` | Verification is not a fourth environment. |
| `RUNTIME_PROFILE` | `daily` | `verification` | Must match the invoked command. |
| `APP_HOST` | loopback | Compose internal | Verification app port is not published to the host. |
| `APP_PORT` | documented local port | internal container port | Integer in range and profile-specific. |
| `PUBLIC_ORIGIN` | local HTTP origin | Nginx test origin | Absolute URL matching the selected profile. |
| `DATABASE_URL` | Development-only credential/database | different Verification-only credential/database | Secret; never logged or reused across profiles. |
| `DATABASE_POOL_MAX` | bounded local value | bounded test value | Must be positive; not a Production tuning decision. |
| `PROXY_POLICY` | `none` | `one-hop` | Hosted value remains evidence-dependent. |

Startup validates all required keys before binding a listener. Ordinary output may identify a safe
key name and reason code, but never includes supplied secret values, database URLs, SQL/internal
exceptions, filesystem paths, container inspect output, or stack traces.

## Profile ownership and isolation

- Development and Verification use exact, different Compose project names, networks, credentials,
  database names, and named volumes.
- Development publishes database access to loopback only. Verification publishes only Nginx; its
  application and database ports remain internal.
- Routine `stop` never removes the Development volume.
- Reset and cleanup use resolved allowlisted identifiers. They must not use wildcards,
  `podman volume rm --all`, broad labels, unresolved environment variables, or force removal.
- Verification always cleans its own project after pass or fail. It never stops, resets, connects
  to, or depends on Development resources.

## Verification result contract

The Verification operation emits one line/object for each required contract:

```text
build, configuration, migration, database, liveness, readiness, proxy,
public-route, admin-route, server-route, isolation
```

Each is exactly `PASS` or `FAIL` with an optional safe reason code. The overall result is `PASS`
only when every contract passes. Every report ends with:

> Production-like Verification validates bounded application contracts only; it does not establish
> exact parity with Bangmod/Plesk Production hosting.

## Failure behavior

- A prerequisite, configuration, build, migration, readiness, or check failure returns non-zero.
- Partial startup never produces an overall ready/pass result.
- Cleanup is attempted after Verification failure without replacing the original failure result.
- Diagnostics direct the maintainer to the owning contract and troubleshooting boundary; protected
  values remain redacted.

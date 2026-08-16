# Data Model: Application Foundation & Development Runtime

This Delivery defines operational state only. It intentionally creates no Product/domain entity,
content table, account/authentication model, or seed data. The relational database contains only
Kysely-owned migration bookkeeping until a later approved Delivery adds a real schema.

## Runtime Profile

Represents how the approved application is being executed. It is configuration, not a persisted
business record.

| Field | Type | Rules |
|---|---|---|
| `environment` | `development \| staging \| production` | Authoritative logical environment; required. |
| `profile` | `daily \| verification \| hosted` | Execution topology; required and kept separate from environment identity. |
| `releaseMode` | boolean | `false` for daily; `true` for verification and hosted execution. |
| `proxyPolicy` | `none \| one-hop \| hosting-defined` | `none` for daily, `one-hop` for Verification, `hosting-defined` only after host inspection. |
| `dataStoreId` | string | Resolves to exactly one profile-owned Data Store. |

Valid local combinations are `development/daily` and `development/verification`. Verification is
not a fourth authoritative environment. Production cannot use `daily` or provisional database
settings.

## Runtime Configuration

The validated, immutable startup configuration. It is created before any listener accepts work.

| Field | Type | Sensitivity | Rules |
|---|---|---|---|
| `environment` | enum | public-safe | Must match Runtime Profile. |
| `profile` | enum | public-safe | Must match Runtime Profile. |
| `host` | IP/hostname | restricted | Daily defaults to loopback; Verification app host is Compose-network internal. |
| `port` | integer | public-safe | 1–65535; must not collide with another selected profile endpoint. |
| `publicOrigin` | absolute URL | restricted | Required; scheme/host must match the selected profile contract. |
| `databaseUrl` | connection URL | secret | Required; never printed; credentials must be profile-specific. |
| `databasePoolMax` | positive integer | restricted | Required and bounded; local default is implementation configuration, not a Production constant. |
| `proxyPolicy` | enum | public-safe | Must follow the allowed profile combination above. |
| `logLevel` | enum | public-safe | Allowlisted values only. |

Validation is all-or-nothing. Missing, malformed, contradictory, placeholder Production, or unsafe
binding values produce `CONFIGURATION_INVALID` before listening. Error output may name a safe
configuration key but never includes its supplied value, parsed URL credentials, stack trace, or
infrastructure exception.

## Data Store

The MySQL-compatible database owned by one local profile.

| Field | Type | Rules |
|---|---|---|
| `id` | stable local identifier | Exact allowlisted value for `development` or `verification`. |
| `engineFamily` | string | `mysql-compatible`; local selection is provisionally MySQL 8.4 LTS. |
| `productionParity` | boolean | Always `false` until actual hosting evidence is approved. |
| `volumeName` | string | Exact Delivery-owned name; Development and Verification values differ. |
| `credentialScope` | enum | `development-only` or `verification-only`; never Staging/Production. |
| `persistencePolicy` | enum | `persistent` for Development, `clean-run` for Verification. |
| `exposure` | enum | `loopback` for Development, `internal-network` for Verification. |
| `migrationState` | Migration State | Derived through Kysely migration metadata. |

Relationships:

- One Runtime Profile resolves to one Data Store.
- No Data Store is shared between local profiles.
- The Development volume survives routine stop/restart and changes only through explicit migration
  or reset.
- Verification creates a clean data state per run and removes only its own resources afterward.

## Migration State

Operational state derived from version-controlled migration files and Kysely's migration metadata.

| Field | Type | Rules |
|---|---|---|
| `executed` | ordered string list | Immutable names already recorded by Kysely. |
| `pending` | ordered string list | Version-controlled migrations not yet applied. |
| `status` | `current \| pending \| unavailable \| error` | `current` is required for application readiness. |
| `safeReasonCode` | optional enum | `DATABASE_UNAVAILABLE`, `MIGRATIONS_PENDING`, or `MIGRATION_STATUS_FAILED`. |

The application reads this state at startup/readiness but never changes it. Only the explicit
migration operation may transition `pending` to `current`. This Delivery adds no Product migration
content.

## Component Readiness

The current safe health observation for a required component.

| Field | Type | Rules |
|---|---|---|
| `component` | `application \| database` | Only components that determine application readiness. |
| `status` | `ready \| not-ready` | No partial/ambiguous success value. |
| `reasonCode` | optional enum | Allowlisted, non-sensitive code only. |
| `observedAt` | UTC timestamp | Generated at observation time; not a domain timestamp. |

Overall readiness is `ready` only when configuration was accepted, the application is running,
database connectivity succeeds, and Migration State is `current`. Public/Admin route reachability
and proxy checks are Verification Check Results, not hidden inside readiness.

## Verification Run

An ephemeral result set emitted by the Production-like Verification operation. It need not be
stored in the application database.

| Field | Type | Rules |
|---|---|---|
| `runId` | opaque local identifier | Contains no credential or infrastructure secret. |
| `releaseRevision` | string | Immutable candidate identifier when available. |
| `startedAt` / `finishedAt` | UTC timestamps | Required for completed runs. |
| `state` | `pending \| running \| passed \| failed` | Terminal result is unambiguous. |
| `checks` | ordered Check Result list | Contains exactly one result for every required contract. |
| `parityStatement` | fixed string | States that local checks do not establish Production parity. |

### Check Result

| Field | Type | Rules |
|---|---|---|
| `contract` | enum | `build`, `configuration`, `migration`, `database`, `liveness`, `readiness`, `proxy`, `public-route`, `admin-route`, `server-route`, `isolation`. |
| `result` | `pass \| fail` | Required; no implicit/skipped success. |
| `reasonCode` | optional string | Safe allowlisted reason for failure. |
| `durationMs` | non-negative integer | Timing evidence only. |

## State Transitions

### Daily Development profile

```text
absent --setup--> stopped --start--> starting --ready checks pass--> ready
                            |                  |                     |
                            |                  +--failure----------> failed
                            +--invalid config----------------------> failed

ready --stop--> stopped --start--> ready       (volume preserved)
stopped --explicit exact-target reset--> absent --setup--> stopped (volume replaced)
```

Reset is rejected while the target is ambiguous, while the exact profile token is absent, or when
the resolved target is not the known Development volume.

### Production-like Verification run

```text
pending --clean isolated setup--> running --all checks pass--> passed --scoped teardown--> complete
                                      |
                                      +--any check fails-----> failed --scoped teardown--> complete
```

Cleanup must run after pass or fail and may target only the Verification Compose project/network/
volume. A running daily profile is neither a dependency nor a cleanup target.

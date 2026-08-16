# Data Model: Application Foundation & Development Runtime

This Delivery defines operational state only. It intentionally creates no Product/domain entity,
content table, account/authentication model, or seed data. The relational database contains
Kysely-owned migration bookkeeping plus one migrated `foundation_persistence_marker` operational
table required to prove SC-002; neither is Product/domain persistence.

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
| `fixtureProvenance` | enum | public-safe | `synthetic` or `approved-non-production`; all Production-derived provenance is rejected. |

Validation is all-or-nothing. Missing, empty, malformed, unsupported, out-of-range, or forbidden
cross-profile values produce their specific Safe Diagnostic before the database pool, listener, or
other work is accepted.

## Safe Diagnostic

The single closed failure representation used on command standard output/error, application and
surfaced container/proxy logs, HTTP errors/readiness failures, and Verification results.

| Field | Type | Rules |
|---|---|---|
| `reasonCode` | allowlisted enum | Stable code only; never raw child-process/exception text. |
| `profile` | `foundation \| daily \| verification` | Required safe logical identity. |
| `component` | allowlisted enum | `orchestration`, `configuration`, `application`, `database`, `migration`, `proxy`, `public`, `admin`, `reporting`, `cleanup`, or `security`. |
| `configurationKey` | optional allowlisted key | Present only when the schema key name itself is safe. |
| `remediation` | allowlisted enum | A bounded next action such as `FIX_CONFIGURATION`, `RUN_MIGRATION`, `INSPECT_OWNERSHIP`, `RETRY_SAFE_OPERATION`, or `RUN_CONFIRMED_RECOVERY`. |

The shape has no additional fields and no free-form message. It never contains supplied values,
credentials, connection strings, SQL, stack traces, raw exceptions, filesystem paths, or
unnecessary host/container/proxy details.

## Data Store

The MySQL-compatible database owned by one local profile.

| Field | Type | Rules |
|---|---|---|
| `id` | stable local identifier | Exact allowlisted value for `development` or `verification`. |
| `engineFamily` | string | `mysql-compatible`; local selection is provisionally MySQL 8.4 LTS. |
| `productionParity` | boolean | Always `false` until actual hosting evidence is approved. |
| `volumeName` | string | Exact Delivery-owned name; Development and Verification values differ. |
| `credentialScope` | enum | `development-only` or `verification-only`; never Staging/Production. |
| `fixtureProvenance` | enum | `synthetic` or `approved-non-production`; `production-derived` is invalid in this Delivery. |
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
migration operation may transition `pending` to `current`. The one foundation marker migration is
operational proof only; this Delivery adds no Product migration content.

## Synthetic Persistence Marker

One non-sensitive row in the migrated operational marker table. The application never reads it;
only the Development persistence validation operation may write/read it.

| Field | Type | Rules |
|---|---|---|
| `markerKey` | fixed string | `sc002-development-persistence`; one acceptance row. |
| `markerValue` | opaque synthetic string | Generated for a run, bounded length, contains no protected data. |
| `provenance` | constant | `synthetic`. |

The same row/value must be readable after routine stop/restart. Exact reset reapplies migrations,
so the table exists and migration state is `current`, but the prior row is absent.

## Owned Runtime Resource

A safe normalized observation of one candidate container, network, or volume. It is not persisted in
the database and does not expose raw inspect data.

| Field | Type | Rules |
|---|---|---|
| `resourceType` | `container \| network \| volume` | Exact type. |
| `logicalKey` | allowlisted enum | Manifest-owned role only. |
| `identityDigest` | SHA-256 digest | Derived from exact identity; raw name/ID is not ordinary output. |
| `ownershipSchema` | version string | Must match the current manifest ownership schema. |
| `ownership` | `exact \| absent \| blocked` | `blocked` covers ambiguity, collision, stale/mislabeled state, or unexpected attachment/use. |
| `runtimeState` | allowlisted enum | Only the state needed for the requested action. |
| `attachmentDigest` | SHA-256 digest | Proves expected consumers/mounts without exposing inspect detail. |

Exact ownership is the conjunction of expected type/name, checkout-scoped project, manifest
allowlist, canonical Compose labels, complete custom reverse-DNS labels, and expected attachments.
No single name prefix or provider label is sufficient.

## Resource Inventory

A read-only, ordered snapshot used to prove ownership and bind a destructive confirmation.

| Field | Type | Rules |
|---|---|---|
| `action` | allowlisted lifecycle action | Confirmation is action-specific. |
| `interruptedAction` | optional allowlisted lifecycle action | Present only when `action` is `recover`; binds recovery to the original operation. |
| `profile` | `daily \| verification` | Required. |
| `deliveryKey` | constant | `001-application-foundation`. |
| `checkoutScope` | SHA-256 digest | No raw filesystem path. |
| `manifestDigest` | SHA-256 digest | Binds the selected manifest/allowlist. |
| `resources` | sorted Owned Runtime Resource list | Complete target inventory. |
| `nonTargetDigest` | SHA-256 digest | Before/after proof that Verification and controlled non-target resources did not change. |
| `confirmationToken` | optional SHA-256 digest | Emitted only when ownership is exact for the requested mutation. |
| `observedAt` | UTC timestamp | Evidence only; excluded from the confirmation digest. |

After acquiring the per-profile operation lock, a mutating command immediately re-inventories and
requires the confirmation digest to match. Drift or blocked ownership refuses all mutation.

## Lifecycle Operation

Safe local journal state for a setup/start/stop/restart/migrate/reset/verify/cleanup/recover action.
It is stored atomically in the checkout-local ignored mode-`0600`
`.foundation-state/<profile>/operation.json`, never in the application database, and contains no
protected values. Atomic Verification reports live under `.foundation-state/reports/`.

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque local identifier | Safe, non-secret. |
| `profile` / `action` | allowlisted enums | Exact operation scope. |
| `phase` | allowlisted enum | Last durably recorded phase. |
| `state` | `running \| passed \| failed \| interrupted \| ownership-blocked` | No ambiguous terminal state. |
| `inventoryDigest` / `mutationPlanDigest` | SHA-256 digests | Bind the exact target and intended mutations. |
| `primaryFailure` | optional Safe Diagnostic | First failure is immutable. |
| `secondaryFailures` | Safe Diagnostic list | Cleanup/recovery failures never replace the primary. |
| `safeNextAction` | allowlisted remediation | Retry, inventory, confirmed recovery, or manual ownership review. |
| `startedAt` / `updatedAt` | UTC timestamps | Journal evidence only; never emitted in ordinary diagnostics. |

## Component Readiness

The current safe health observation for a required component.

| Field | Type | Rules |
|---|---|---|
| `component` | `application \| database` | Only components that determine application readiness. |
| `status` | `ready \| not-ready` | No partial/ambiguous success value. |
| `diagnostic` | optional Safe Diagnostic | Required when `not-ready`; the same closed shape as every failure surface. |
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
| `state` | `pending \| running \| passed \| failed \| interrupted \| reported` | Terminal result and report state are unambiguous. |
| `checks` | ordered Check Result list | Contains exactly one result for every required contract. |
| `primaryFailure` | optional Safe Diagnostic | First failed result; cleanup/reporting never overwrite an earlier failure but become primary when every earlier result passed. |
| `parityStatement` | fixed string | States that local checks do not establish Production parity. |

### Check Result

| Field | Type | Rules |
|---|---|---|
| `contract` | enum | `build`, `startup`, `configuration-valid`, `configuration-missing-rejected`, `configuration-empty-rejected`, `configuration-malformed-rejected`, `configuration-unsupported-rejected`, `configuration-out-of-range-rejected`, `configuration-cross-profile-rejected`, `migration`, `database`, `liveness`, `readiness`, `isolation`, `proxy`, `public-route`, `admin-route`, `server-route`, `cleanup`, `reporting`. |
| `result` | `pass \| fail` | Required; no implicit/skipped success. |
| `diagnostic` | optional Safe Diagnostic | Required for failure. Blocked checks use `PREREQUISITE_FAILED`. |
| `durationMs` | non-negative integer | Timing evidence only. |

## State Transitions

### Daily Development profile

```text
absent --setup--> stopped --start--> starting --ready checks pass--> ready
                            |                  |                     |
                            |                  +--failure/interruption--> stopped or not-ready
                            +--invalid config--------------------------> stopped or not-ready

ready --stop--> stopped --start--> ready       (volume preserved)
stopped --exact inventory + confirmed reset--> absent --migrate--> stopped (empty marker table)

stopped/not-ready --status + exact inventory--> safe retry or confirmed recovery
any state --ownership blocked-----------------> read-only refusal / manual ownership review
```

Reset/recovery is rejected without a matching action-bound inventory token or when resources are
ambiguous, stale/colliding, mislabeled, unexpectedly active/attached, or changed after inventory.
Interrupted migration never auto-resets; status inspection must prove a safe pending retry.

### Production-like Verification run

```text
absent --clean isolated setup--> running --main checks--> cleanup --report validation--> reported
                                    |              |              |
                                    |              |              +--> passed or failed
                                    |              +--failure adds cleanup diagnostic
                                    +--failure/interruption preserves primary diagnostic

pre-existing/interrupted resources --inventory-confirmed recover--> absent
pre-existing resources with blocked ownership---------------------> read-only refusal
```

Cleanup runs after pass or fail only while current-run ownership remains exact. Main failure plus
cleanup failure retains the main failure and adds the cleanup failure; main success plus cleanup
failure makes cleanup primary. The final report is emitted only after cleanup and validates every
required result plus nondisclosure. A running daily profile is neither a dependency nor a target.

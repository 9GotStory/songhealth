# Data Model: Application Foundation & Development Runtime

This Delivery defines operational state only. It intentionally creates no Product/domain entity,
content table, account/authentication model, or seed data. The relational database contains
Kysely-owned migration bookkeeping plus one migrated `foundation_persistence_marker` operational
table required to prove SC-002; neither is Product/domain persistence.

## Execution Context

Represents the distinct identity dimensions for configuration, execution topology, local command/
resource selection, and safe diagnostic output. It is configuration, not a persisted business
record.

| Field | Type | Rules |
|---|---|---|
| `environment` | `development \| staging \| production` | Authoritative logical environment; required. |
| `runtimeProfile` | `daily \| verification \| hosted` | Execution topology; required and kept separate from environment identity. |
| `operationTarget` | optional `development \| verification` | Local command/resource selector; required for local operations and absent for hosted execution. |
| `diagnosticScope` | `foundation \| daily \| verification` | Derived output context; never accepted as user configuration or resource identity. |
| `releaseMode` | boolean | `false` for daily; `true` for verification and hosted execution. |
| `proxyPolicy` | `none \| one-hop \| hosting-defined` | `none` for daily, `one-hop` for Verification, `hosting-defined` only after host inspection. |
| `dataStoreId` | optional string | Each local operation target resolves to exactly one owned Data Store. |

Valid local mappings are:

| Operation target | Environment | Runtime profile | Diagnostic scope |
|---|---|---|---|
| `development` | `development` | `daily` | `daily` |
| `verification` | `development` | `verification` | `verification` |

Cross-target foundation preflight derives `diagnosticScope=foundation` while retaining the
target-specific context of each inspected resource. Verification is not a fourth authoritative
environment. Hosted Staging/Production is not selectable through local operation commands, and
Production cannot use `daily`, `verification`, or provisional database settings.

## Runtime Configuration

The validated, immutable startup configuration. It is created before any listener accepts work.

| Field | Type | Sensitivity | Rules |
|---|---|---|---|
| `environment` | enum | public-safe | Must match Execution Context. |
| `runtimeProfile` | enum | public-safe | Must match Execution Context. |
| `operationTarget` | enum | public-safe | Supplied by the local command boundary and must match Execution Context. |
| `host` | IP/hostname | restricted | Daily defaults to loopback; Verification app host is Compose-network internal. |
| `port` | integer | public-safe | 1–65535; must not collide with another selected operation-target endpoint. |
| `publicOrigin` | absolute URL | restricted | Required; scheme/host must match the selected runtime-profile contract. |
| `databaseUrl` | connection URL | secret | Required; never printed; credentials must be operation-target-specific. |
| `databasePoolMax` | positive integer | restricted | Required and bounded; local default is implementation configuration, not a Production constant. |
| `proxyPolicy` | enum | public-safe | Must follow the allowed Execution Context mapping above. |
| `logLevel` | enum | public-safe | Allowlisted values only. |
| `fixtureProvenance` | enum | public-safe | `synthetic` or `approved-non-production`; all Production-derived provenance is rejected. |

Validation is all-or-nothing. Missing, empty, malformed, unsupported, out-of-range, or forbidden
cross-identity values produce their specific Safe Diagnostic before the database pool, listener, or
other work is accepted.

## Safe Diagnostic

The single closed failure representation used on command standard output/error, application and
surfaced container/proxy logs, HTTP errors/readiness failures, and Verification results.

| Field | Type | Rules |
|---|---|---|
| `reasonCode` | allowlisted enum | Stable code only; never raw child-process/exception text. |
| `diagnosticScope` | `foundation \| daily \| verification` | Required derived output context. |
| `component` | allowlisted enum | `orchestration`, `configuration`, `application`, `database`, `migration`, `proxy`, `public`, `admin`, `reporting`, `cleanup`, or `security`. |
| `configurationKey` | optional allowlisted key | Present only when the schema key name itself is safe. |
| `remediation` | allowlisted enum | A bounded next action such as `FIX_CONFIGURATION`, `RUN_MIGRATION`, `INSPECT_OWNERSHIP`, `RETRY_SAFE_OPERATION`, `RUN_CONFIRMED_RECOVERY`, `RUN_CONFIRMED_RESET`, or `REVIEW_MANUALLY`. |

The shape has no additional fields and no free-form message. It never contains supplied values,
credentials, connection strings, SQL, stack traces, raw exceptions, filesystem paths, or
unnecessary host/container/proxy details.

## Data Store

The MySQL-compatible database resource owned by one local operation target.

| Field | Type | Rules |
|---|---|---|
| `id` | stable local resource identifier | Exact Delivery-owned identifier; it is not an identity dimension. |
| `operationTarget` | `development \| verification` | Owning local operation target. |
| `runtimeProfile` | `daily \| verification` | Associated execution topology; derived from operation target. |
| `engineFamily` | string | `mysql-compatible`; local selection is provisionally MySQL 8.4 LTS. |
| `productionParity` | boolean | Always `false` until actual hosting evidence is approved. |
| `volumeName` | string | Exact Delivery-owned name; Development and Verification values differ. |
| `credentialScope` | enum | `development-only` or `verification-only`; never Staging/Production. |
| `fixtureProvenance` | enum | `synthetic` or `approved-non-production`; `production-derived` is invalid in this Delivery. |
| `persistencePolicy` | enum | `persistent` for Development, `clean-run` for Verification. |
| `exposure` | enum | `loopback` for Development, `internal-network` for Verification. |
| `migrationState` | Migration State | Derived through Kysely migration metadata. |

Relationships:

- One local Execution Context resolves to one Data Store.
- No Data Store is shared between operation targets.
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
| `operationTarget` | `development \| verification` | Exact local command/resource selection. |
| `runtimeProfile` | `daily \| verification` | Associated topology; must match operation target. |
| `deliveryKey` | constant | `001-application-foundation`. |
| `checkoutScope` | SHA-256 digest | No raw filesystem path. |
| `manifestDigest` | SHA-256 digest | Binds the selected manifest/allowlist. |
| `resources` | sorted Owned Runtime Resource list | Complete target inventory. |
| `nonTargetDigest` | SHA-256 digest | Before/after proof that Verification and controlled non-target resources did not change. |
| `assessmentDigest` | optional SHA-256 digest | Binds normalized integrity, repeatability, repair, and reconstructibility evidence when required. |
| `confirmationToken` | optional SHA-256 digest | Emitted only when ownership and all action-specific recovery-assessment predicates pass. |
| `observedAt` | UTC timestamp | Evidence only; excluded from the confirmation digest. |

After acquiring the per-operation-target lock, a mutating command immediately re-inventories,
recomputes applicable assessment evidence, and requires the confirmation digest to match. Drift,
blocked ownership, or a changed assessment refuses all mutation.

## Lifecycle Operation

Safe local journal state for a setup/start/stop/restart/migrate/reset/verify/cleanup/recover action.
It is stored atomically in the checkout-local ignored mode-`0600`
`.foundation-state/<operation-target>/operation.json`, never in the application database, and
contains no protected values. Atomic Verification reports live under `.foundation-state/reports/`.

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque local identifier | Safe, non-secret. |
| `operationTarget` / `runtimeProfile` / `action` | allowlisted enums | Exact operation and topology scope. |
| `phase` | allowlisted enum | Last durably recorded phase. |
| `state` | `running \| passed \| failed \| interrupted \| ownership-blocked` | No ambiguous terminal state. |
| `inventoryDigest` / `mutationPlanDigest` | SHA-256 digests | Bind the exact target and intended mutations. |
| `primaryFailure` | optional Safe Diagnostic | First failure is immutable. |
| `secondaryFailures` | Safe Diagnostic list | Cleanup/recovery failures never replace the primary. |
| `recoveryAssessment` | optional Recovery Assessment | Required after failure/interruption or incompatible/corrupted state before another action. |
| `safeNextAction` | allowlisted remediation | Retry, non-destructive recovery, confirmed reset/cleanup, or manual review. |
| `startedAt` / `updatedAt` | UTC timestamps | Journal evidence only; never emitted in ordinary diagnostics. |

## Recovery Assessment

A normalized, evidence-gated decision attached to the Lifecycle Operation. It introduces no service
or database table and never stores raw Podman/database output.

| Field | Type | Rules |
|---|---|---|
| `originOperationId` | opaque local identifier | Immutable link to the failed/interrupted operation. |
| `originAction` / `originPhase` | allowlisted enums | Last durably recorded action and phase. |
| `originalFailure` | Safe Diagnostic | Immutable; later attempt failures are secondary. |
| `operationTarget` | `development \| verification` | Must match the journal and inventory. |
| `runtimeProfile` | `daily \| verification` | Must match the operation target. |
| `ownershipVerdict` | `confirmed \| unconfirmed` | Any ambiguity, collision, mislabel, drift, or unexpected attachment is `unconfirmed`. |
| `integrityVerdict` | `valid \| invalid \| not-applicable \| unknown` | `invalid` requires a completed allowlisted check; an unavailable/inconclusive check is `unknown`. |
| `repeatabilityVerdict` | `safe \| unsafe \| unknown` | Derived from action, durable phase, idempotency rule, and mutation-plan evidence. |
| `reconstructibilityVerdict` | `confirmed \| not-reconstructible \| not-applicable \| unknown` | Confirmed only by migrations plus a verified fixture/replay source. |
| `repairDisposition` | `verified-available \| unavailable \| failed \| not-applicable` | A generic or unreviewed repair is never available. |
| `repairId` | optional allowlisted enum | This Delivery permits only `recreate-database-runtime-preserve-volume` for Development. |
| `inventoryDigest` | SHA-256 digest | Exact ownership and attachment evidence. |
| `integrityEvidenceDigest` | SHA-256 digest | Normalized compatibility/connectivity/migration evidence. |
| `reconstructibilityEvidenceDigest` | optional SHA-256 digest | Migration and synthetic/approved fixture reconstruction evidence. |
| `mutationPlanDigest` | SHA-256 digest | Exact intended mutations. |
| `decision` | `retry \| recover \| reset \| manual-review` | Derived in the fixed order below. |
| `attemptFailures` | Safe Diagnostic list | Append-only secondary failures; never replace `originalFailure`. |
| `resolution` | `pending \| resolved \| unresolved` | Readiness requires successful postchecks, not merely an authorized action. |

Decision order:

1. Any unconfirmed/unknown applicable ownership, integrity, repeatability, or reconstructibility
   evidence yields `manual-review` and no mutation token.
2. Confirmed ownership plus valid/not-applicable integrity and proven safe repeatability yields
   `retry`.
3. Otherwise, an allowlisted verified repair yields `recover`; recovery preserves the Development
   volume/data and must pass integrity postchecks.
4. Otherwise, confirmed reconstructibility plus unavailable/failed repair yields `reset`; reset
   requires a fresh exact reset token and explicit confirmation.
5. Every other state yields `manual-review`.

The SC-002 synthetic marker plus tracked migrations is reconstructible. An approved non-Production
fixture without a verified replay source is `unknown`. This Delivery defines no generic SQL repair,
migration rollback, or backup restore. Verification disposal is a cleanup action, never recovery.

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
| `contract` | enum | `build`, `startup`, `configuration-valid`, `configuration-missing-rejected`, `configuration-empty-rejected`, `configuration-malformed-rejected`, `configuration-unsupported-rejected`, `configuration-out-of-range-rejected`, `configuration-identity-conflict-rejected`, `migration`, `database`, `liveness`, `readiness`, `isolation`, `proxy`, `public-route`, `admin-route`, `server-route`, `cleanup`, `reporting`. |
| `result` | `pass \| fail` | Required; no implicit/skipped success. |
| `diagnostic` | optional Safe Diagnostic | Required for failure. Blocked checks use `PREREQUISITE_FAILED`. |
| `durationMs` | non-negative integer | Timing evidence only. |

## Dependency Finding Review

`docs/security/dependency-findings.json` is a normalized committed evidence document with top-level
`schemaVersion`, `lockfileDigest`, `releaseGraphDigest`, and a sorted `findings` array. Each array
item is one Dependency Finding Review row. The document is not Product data, and raw scanner/
package-manager output is not persisted in it.

| Field | Type | Rules |
|---|---|---|
| `findingKey` | stable digest | Advisory + package + installed version + normalized release path; unique and sorted. |
| `confirmed` | boolean | Pending/unknown confirmation is invalid evidence. |
| `confirmationEvidence` | repository-verifiable reference | Required evidence for the confirmation verdict. |
| `foundationRelevant` / `relevanceRationale` | boolean plus bounded rationale | Both are required; the rationale is protected-data-safe. |
| `severity` | `critical \| high \| medium \| low` | Unknown/unsupported scanner severity blocks normalization. |
| `reachability` | `reachable \| not-reachable \| not-applicable \| unknown` | `unknown` blocks pending triage. |
| `productionExposure` | `exposed \| not-exposed \| not-applicable \| unknown` | `unknown` blocks pending triage. |
| `mitigation` / `disposition` | normalized enums plus evidence reference | No free-form raw scanner output. |
| `owner` / `reviewDate` | non-empty role/reference and UTC date | Required for every current finding. |
| `firstObservedAt` | UTC instant | Stable deadline anchor; triage cannot move it later. |
| `remediationDueAt` | optional UTC instant | Required at no later than +90 days for Medium or +180 days for Low; overdue when `asOf > remediationDueAt`. |
| `approval` | optional Dependency Approval | Required for an unfixed actionable Critical/High disposition. |

`actionable` is derived only when the finding is confirmed, is present in the locked release graph,
is foundation-relevant, and is reachable or Production-exposed. Unknown reachability or exposure
blocks before actionability is accepted. A valid exact empty ledger represents zero findings.

### Dependency Approval

| Field | Type | Rules |
|---|---|---|
| `kind` | `mitigation \| risk-exception` | Must bind to the unchanged finding and release graph. |
| `securityTechnicalReviewEvidence` | repository-verifiable reference | Required and protected-data-safe. |
| `productOwnerApprovalEvidence` | repository-verifiable reference | Required; Product Owner is the exception authority. |
| `approvedAt` | UTC instant | Required. |
| `expiresAt` | UTC instant | Risk exception only; no later than +7 days for Critical or +30 days for High. Exact expiry is expired. |

Actionable Critical/High blocks unless fixed or covered by a current approved mitigation/risk
exception. Medium/Low severity and overdue status do not block, but complete evidence and the
90/180-day due dates remain required and overdue state is reported.

## State Transitions

### Daily runtime profile / Development operation target

```text
absent --setup--> stopped --start--> starting --ready checks pass--> ready
                            |                  |                     |
                            |                  +--failure/interruption--> stopped or not-ready
                            +--invalid config--------------------------> stopped or not-ready

ready --stop--> stopped --start--> ready       (volume preserved)
stopped --exact inventory + confirmed reset--> absent --migrate--> stopped (empty marker table)

stopped/not-ready --status + assessment--> retry | non-destructive recover | confirmed reset | manual review
any state --unknown/unconfirmed evidence-----> read-only refusal / manual review
```

Retry/recovery/reset is rejected without a matching assessment; reset also requires a fresh
action-bound inventory token. Ambiguous, stale/colliding, mislabeled, unexpectedly active/attached,
or changed resources force manual review. Recovery may recreate the exact Development database
container/network while preserving the named volume; it never deletes or mutates Development data.
Interrupted migration never auto-resets; status must prove safe repeatability or route to manual
review/reset under the full decision rules.

### Production-like Verification run

```text
absent --clean isolated setup--> running --main checks--> cleanup --report validation--> reported
                                    |              |              |
                                    |              |              +--> passed or failed
                                    |              +--failure adds cleanup diagnostic
                                    +--failure/interruption preserves primary diagnostic

pre-existing/interrupted disposable resources --inventory-confirmed cleanup--> absent
pre-existing resources with blocked ownership---------------------> read-only refusal
```

Cleanup runs after pass or fail only while current-run ownership remains exact. Main failure plus
cleanup failure retains the main failure and adds the cleanup failure; main success plus cleanup
failure makes cleanup primary. The final report is emitted only after cleanup and validates every
required result plus nondisclosure. A running daily runtime profile/Development operation target is
neither a dependency nor a Verification cleanup target.

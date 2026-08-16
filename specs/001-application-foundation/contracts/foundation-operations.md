# Foundation Operations Contract

This contract defines the maintainer-facing entry points and operation-target/runtime-profile safety
rules. Script names are stable repository interfaces; their internal implementation remains a later
task.

## Prerequisites

- Node.js 24.x LTS with its supported npm CLI
- Podman with a configured Compose provider (`podman compose` must succeed)
- ability to bind the documented loopback ports
- a clean checkout and safe local configuration copied from the committed examples
- required container/security-scanner images available locally before timed acceptance begins

Production credentials, Production data, a native database service, and a running daily runtime
profile are not prerequisites. This Delivery accepts only synthetic or explicitly approved
non-Production fixtures and rejects all Production-derived data, including sanitized/minimized
copies.

## Commands

| Command | Contract |
|---|---|
| `npm ci` | Install exactly the lockfile dependency graph. |
| `npm run foundation:check` | Check Node/npm/Podman/Compose availability, required files, safe execution-context configuration, and port availability without starting services. |
| `npm run dev:setup` | Validate the Development operation target/daily runtime profile, create/start only its database dependency, explicitly apply tracked migrations, and stop with an actionable non-zero result on failure. |
| `npm run dev:start` | Start the Development database if needed and the native server/Public/Admin development processes; repeated invocation must not create duplicate resources. |
| `npm run dev:ready` | Poll bounded readiness and route checks; return zero only when the whole daily foundation is ready. |
| `npm run dev:stop` | Stop native processes and the Development database container without removing its named volume. Repetition is safe. |
| `npm run dev:restart` | Perform the documented stop/start sequence and preserve Development data. |
| `npm run foundation:status -- --target <development\|verification>` | Read the target journal/inventory/integrity evidence and emit exactly one normalized target-appropriate Recovery Assessment without mutation: Development permits `retry`, `recover`, `reset`, or `manual-review`; Verification permits `retry`, `cleanup`, or `manual-review`. |
| `npm run foundation:inventory -- --target <development\|verification> --action <action> [--operation <interrupted-action>] [--repair <allowlisted-repair>] [--token-only]` | Perform typed read-only inspection and emit normalized inventory/assessment evidence plus an action-bound token only when ownership and every predicate for that action pass. `--token-only` suppresses the inventory body, not validation. |
| `npm run dev:reset -- --confirm <reset-inventory-token>` | Re-inventory under the Development target lock, require confirmed reconstructibility, remove/recreate only exact confirmed Data Store resources, and apply migrations. A routine intentional reset may proceed from healthy state; a reset selected by a failed/incompatible-state Recovery Assessment additionally requires non-destructive repair to be unavailable or failed. Missing/stale/mismatched evidence or uncertainty fails without mutation. |
| `npm run foundation:recover -- --target development --operation <interrupted-action> --repair recreate-database-runtime-preserve-volume --confirm <recovery-token>` | Run the only allowlisted Development recovery: reconcile exact database container/network runtime state while preserving its named volume/data, then require connectivity, integrity, and migration-status postchecks. It never performs reset, SQL repair, migration rollback, or backup restore. |
| `npm run foundation:cleanup -- --target verification --confirm <cleanup-token>` | Remove only exact confirmed disposable Verification resources after ownership/reconstructibility checks; it never targets Development and is the explicit stale/interrupted Verification disposal path. |
| `npm run foundation:test-interruption -- --target <development\|verification> --action <start\|stop\|migrate\|reset\|cleanup> --phase <allowlisted-phase>` | Acceptance-only controlled fault injection for synthetic local operation targets. It exercises journal, assessment, Development retry/recovery/reset, Verification retry/cleanup, manual review, and primary-failure preservation; it refuses hosted or Production-derived configuration. |
| `npm run dev:persistence-check -- --confirm <reset-inventory-token>` | Write one synthetic marker, inventory resources, prove the same value after restart, perform the confirmed reconstructible reset, prove the old marker absent and migrations current, and validate that only Development Data Store inventory changed. |
| `npm run db:status -- --target <development\|verification>` | Report `current`, `pending`, or a safe failure code without applying migrations. |
| `npm run db:migrate -- --target <development\|verification>` | Apply pending version-controlled migrations explicitly to the selected non-Production operation target. |
| `npm run verify:production-like` | Require an absent clean Verification inventory, then build, start database/application/Nginx, apply migrations explicitly, run every ordered result, perform exact current-run cleanup, validate nondisclosure/report completeness, atomically emit the report and parity statement, and return non-zero if any result fails. |
| `npm run check` | Run deterministic typecheck, lint/static/import-boundary checks, independent builds, focused diagnostic/HTTP/database/operation-target tests, and `security:check`; return non-zero on failure. |
| `npm run security:secrets` | Prove the pinned Gitleaks scanner with an ephemeral detectable canary, then scan tracked content; a failed canary or detected committed secret is blocking. |
| `npm run security:dependencies` | Normalize scanner findings, reconcile them exactly to the locked release graph and committed dependency ledger, and enforce the FR-013/SC-008 policy in [foundation-security.md](foundation-security.md). |
| `npm run security:asvs` | Validate every applicable foundation ASVS 5.0.0 matrix row has applicability, implementation, verification, and evidence; authentication/session rows must carry the FR-016 not-applicable rationale. |
| `npm run security:check` | Run secrets, dependency, and ASVS gates; return non-zero for a secret, blocking dependency state, or incomplete evidence. |

## Configuration examples

The repository provides separate `.env.development.example` and `.env.verification.example` files.
Actual local files are ignored by Git. Example values are non-secret placeholders and must never be
accepted as Production configuration.

Minimum logical keys:

The command boundary supplies `operationTarget` through `--target`; it is not an environment-file
key. `diagnosticScope` is derived output context and is never accepted as configuration.

| Operation target | `APP_ENVIRONMENT` | `RUNTIME_PROFILE` | Diagnostic scope |
|---|---|---|---|
| `development` | `development` | `daily` | `daily` |
| `verification` | `development` | `verification` | `verification` |

Cross-target foundation preflight may emit `diagnosticScope=foundation`. Hosted execution is not
selectable by these local commands.

| Key | Development | Verification | Safety rule |
|---|---|---|---|
| `APP_ENVIRONMENT` | `development` | `development` | Verification is not a fourth environment. |
| `RUNTIME_PROFILE` | `daily` | `verification` | Must match the invoked command. |
| `APP_HOST` | loopback | Compose internal | Verification app port is not published to the host. |
| `APP_PORT` | documented local port | internal container port | Integer in range and operation-target-specific. |
| `PUBLIC_ORIGIN` | local HTTP origin | Nginx test origin | Absolute URL matching the selected runtime profile. |
| `DATABASE_URL` | Development-only credential/database | different Verification-only credential/database | Secret; never logged or reused across operation targets. |
| `DATABASE_POOL_MAX` | bounded local value | bounded test value | Must be positive; not a Production tuning decision. |
| `PROXY_POLICY` | `none` | `one-hop` | Hosted value remains evidence-dependent. |
| `LOG_LEVEL` | allowlisted local level | allowlisted Verification level | Never enables raw exception/tool passthrough. |
| `FIXTURE_PROVENANCE` | `synthetic` or `approved-non-production` | `synthetic` or `approved-non-production` | `production-derived` and all other values are rejected in this Delivery. |

Startup validates all required keys before creating a database pool, binding a listener, or
accepting other work. The required rejection classes are:

| Class | Safe reason code |
|---|---|
| required key absent | `CONFIG_MISSING` |
| required value empty | `CONFIG_EMPTY` |
| wrong type/format | `CONFIG_MALFORMED` |
| unsupported enum/value | `CONFIG_UNSUPPORTED` |
| numeric/size value outside its allowed range | `CONFIG_OUT_OF_RANGE` |
| forbidden environment/runtime-profile/operation-target/credential/resource combination | `CONFIG_IDENTITY_CONFLICT` |

## Safe diagnostic contract

Every failure emitted on command standard output/error, application logs, surfaced container/proxy
logs, HTTP errors/readiness components, or Verification reports has exactly this logical shape:

```json
{
  "reasonCode": "ALLOWLISTED_CODE",
  "diagnosticScope": "foundation | daily | verification",
  "component": "ALLOWLISTED_COMPONENT",
  "configurationKey": "OPTIONAL_SAFE_SCHEMA_KEY",
  "remediation": "ALLOWLISTED_NEXT_ACTION"
}
```

`configurationKey` is optional; every other field is required and additional properties/free-form
messages are prohibited. Remediation is a bounded code/instruction, never interpolated raw tool
output. Application serializers, proxy/container logging configuration, orchestration adapters,
HTTP schemas, and the final report map failures into this shape. Raw Compose/Podman/Nginx/database
standard error is never passed through as ordinary output.

Forbidden content includes supplied values, credentials, connection strings, SQL, internal
exceptions/stacks, filesystem paths, raw inspect output, and unnecessary host/container/proxy
details. Tests inject unique sentinel values and scan every named surface for both exact and encoded
forms.

## Operation-target ownership and isolation

- The Development and Verification operation targets use exact, different Compose project names,
  networks, credentials, database names, and named volumes.
- Development publishes database access to loopback only. Verification publishes only Nginx; its
  application and database ports remain internal.
- Routine `stop` never removes the Development volume.
- Every manifest resource carries canonical Compose labels plus the complete custom label set
  `org.songhealth.foundation.delivery`, `.checkout`, `.environment`, `.runtime-profile`,
  `.operation-target`, `.resource`, and `.ownership-schema`.
- Mutation is allowed only when typed inspection proves exact expected type/name, checkout-scoped
  project, manifest membership, all canonical/custom labels, and expected attachments/mounts. A
  second inventory under the operation-target lock must match the action-bound confirmation digest.
- Ambiguous, stale/colliding, mislabeled, unexpectedly active/attached, token-mismatched, or changed
  resources are read-only refusal states. No confirmation token is issued; remediation is bounded to
  safe inspection/manual ownership review.
- Reset/cleanup removes recorded exact resources individually and never uses name prefixes,
  wildcards, label-filter deletion, `--remove-orphans`, broad `down --volumes`, prune, unresolved
  variables, or force removal. Recovery may reconcile only the exact Development database
  container/network and must preserve the named volume and its data.
- Verification requires no pre-existing resources. Current-run cleanup is automatic after pass/fail
  only while its journal and ownership remain exact; otherwise it refuses mutation and records a
  cleanup failure. It never stops, resets, connects to, or depends on Development resources.

## Verification result contract

The Verification operation emits one line/object for each required contract:

```text
build,
startup,
configuration-valid,
configuration-missing-rejected,
configuration-empty-rejected,
configuration-malformed-rejected,
configuration-unsupported-rejected,
configuration-out-of-range-rejected,
configuration-identity-conflict-rejected,
migration,
database,
liveness,
readiness,
isolation,
proxy,
public-route,
admin-route,
server-route,
cleanup,
reporting
```

Each is exactly `PASS` or `FAIL`; failure contains one Safe Diagnostic. A dependency-blocked check
is explicitly `FAIL` with `PREREQUISITE_FAILED`, never absent/skipped. Cleanup runs after main
checks. Reporting passes only when the complete ordered inventory, cleanup result, diagnostic schema,
nondisclosure scan, parity statement, and atomic final emission all succeed. If report emission
fails, fallback standard error is itself one Safe Diagnostic.

The first main failure is immutable. A later cleanup/reporting failure is secondary; when all main
checks pass, cleanup becomes primary if it fails, and when every earlier result passes, reporting is
primary if it fails. Overall `PASS` requires all twenty results to pass.
Every report ends with:

> Production-like Verification validates bounded application contracts only; it does not establish
> exact parity with Bangmod/Plesk Production hosting.

## Failure behavior

- A prerequisite, configuration, build, startup, migration, readiness, security-gate, or contract
  failure returns non-zero.
- Partial startup never produces an overall ready/pass result.
- The operation journal is written atomically before mutation and after every phase. SIGINT/SIGTERM
  records `OPERATION_INTERRUPTED`, attempts only exact current-run cleanup, preserves conventional
  signal exit semantics, and leaves the operation target stopped or not-ready.
- Journals are ignored mode-`0600` files at
  `.foundation-state/<operation-target>/operation.json`; atomic
  Verification reports are written under `.foundation-state/reports/`. Both contain only normalized
  state and Safe Diagnostics, never protected values or raw tool output.
- On the next invocation, an unclosed `running` journal is treated as interrupted and
  `foundation:status` derives exactly one decision in this fixed order:

  | Decision | Required predicates |
  |---|---|
  | `manual-review` | Any applicable ownership, integrity, repeatability, or reconstructibility evidence is unconfirmed/unknown; no token or mutation is allowed. |
  | `retry` | Ownership is confirmed, integrity is valid/not-applicable, and the interrupted operation/phase is proven safely repeatable. |
  | `recover` | Development only: retry does not apply and `recreate-database-runtime-preserve-volume` is verified available; recovery is bounded, non-destructive, and must pass postchecks. |
  | `reset` | Development only: retry/recovery do not apply, reconstructibility is confirmed, and repair is unavailable or failed; a fresh exact reset token and explicit confirmation are required. |
  | `cleanup` | Verification only: retry does not apply, exact ownership is confirmed, and every target resource is confirmed disposable/reconstructible; a fresh exact cleanup token and explicit confirmation are required. |

  Any state not satisfying a permitted action is `manual-review`. An approved non-Production
  fixture without a verified replay source has unknown reconstructibility. Interrupted migration
  never auto-resets or rolls back.
- Retry/recovery/reset/cleanup attempts bind the origin operation/action/phase, immutable original-failure
  digest, operation target/runtime profile, inventory, integrity/reconstructibility evidence,
  selected action/repair, and mutation plan. The command locks, re-evaluates, and rejects drift.
- Recovery and cleanup cannot replace the immutable primary failure. A failed retry/recovery/reset/cleanup
  appends a secondary diagnostic and keeps the target stopped/not-ready. Main failure plus cleanup
  failure reports both; main success plus cleanup failure makes cleanup primary, and reporting is
  primary only when every earlier result passed.
- Ownership that cannot be proven returns `RESOURCE_OWNERSHIP_UNPROVEN` without mutation. Inventory
  drift returns `RESOURCE_INVENTORY_CHANGED`; unknown integrity or reconstructibility returns the
  applicable safe refusal diagnostic. Diagnostics use only the safe contract and bounded
  remediation.

## Timing boundaries

- SC-001 starts immediately before `npm ci` in a clean checkout after the checkout, external tools,
  and required images are local. It ends only after configuration preparation, preflight, database
  creation, explicit migration, native app startup, and passing `dev:ready`.
- SC-003 starts when `npm run verify:production-like` is invoked after release-candidate source,
  Verification configuration, external tools, and required images are local. It ends only after
  build, every required result including cleanup, and successful final report emission.

## Security quality gate

`docs/security/asvs-foundation-evidence.md` is the implementation evidence matrix and follows
[foundation-security.md](foundation-security.md). Applicable ASVS 5.0.0 Level 1 rows are the floor;
selected Level 2 rows require risk rationale. Authentication/session rows are not applicable under
FR-016. The gate makes no blanket ASVS compliance claim and does not add arbitrary coverage or a
Product browser journey. The one-shot scanner is fixed to
`ghcr.io/gitleaks/gitleaks:v8.29.1@sha256:aa036a2f4bdfe3cc3c55fa4326308efabb4a6be498c883c864fd1d0d5585438a`;
upgrades require a reviewed digest change and passing canary.

`docs/security/dependency-findings.json` is the normalized locked-graph evidence ledger. Dependency
gate schema, exact reconciliation, actionability, Product Owner approval, exception expiry, and
Medium/Low due-date rules follow [foundation-security.md](foundation-security.md). Raw scanner or
package-manager output is never the committed evidence record or copied into Verification output.

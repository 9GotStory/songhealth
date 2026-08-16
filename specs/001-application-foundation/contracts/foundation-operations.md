# Foundation Operations Contract

This contract defines the maintainer-facing entry points and profile safety rules. Script names are
stable repository interfaces; their internal implementation remains a later task.

## Prerequisites

- Node.js 24.x LTS with its supported npm CLI
- Podman with a configured Compose provider (`podman compose` must succeed)
- ability to bind the documented loopback ports
- a clean checkout and safe local configuration copied from the committed examples
- required container/security-scanner images available locally before timed acceptance begins

Production credentials, Production data, a native database service, and a running daily profile are
not prerequisites. This Delivery accepts only synthetic or explicitly approved non-Production
fixtures and rejects all Production-derived data, including sanitized/minimized copies.

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
| `npm run foundation:status -- --profile <development\|verification>` | Read the safe operation journal plus current normalized inventory and return the next allowed action without mutation. |
| `npm run foundation:inventory -- --profile <profile> --action <action> [--operation <interrupted-action>] [--token-only]` | Perform typed read-only inspection and emit a safe normalized inventory plus an action-bound confirmation token only when exact ownership is proven. Recovery tokens also bind the interrupted operation; `--token-only` suppresses the inventory body, not validation. |
| `npm run dev:reset -- --confirm <inventory-token>` | Re-inventory under the Development lock, stop/remove only exact confirmed datastore resources, recreate them, and explicitly apply migrations. Missing/stale/mismatched confirmation or blocked ownership fails without mutation. |
| `npm run foundation:recover -- --profile <profile> --operation <interrupted-action> --confirm <inventory-token>` | Reconcile only the exact interrupted operation bound into a `recover` inventory token. Development recovery preserves data unless the separately confirmed operation is reset; Verification cleanup may remove only its disposable resources. |
| `npm run foundation:test-interruption -- --profile <profile> --action <start\|stop\|migrate\|reset\|cleanup> --phase <allowlisted-phase>` | Acceptance-only controlled fault injection for synthetic local profiles. It exercises journal, signal/failure, next-run detection, safe retry/recovery, and primary-failure preservation; it refuses non-local or Production-derived configuration. |
| `npm run dev:persistence-check -- --confirm <reset-inventory-token>` | Write one synthetic marker, inventory resources, prove the same value after restart, perform the confirmed reset, prove the old marker absent and migrations current, and validate that only Development datastore inventory changed. |
| `npm run db:status -- --profile <development\|verification>` | Report `current`, `pending`, or a safe failure code without applying migrations. |
| `npm run db:migrate -- --profile <development\|verification>` | Apply pending version-controlled migrations explicitly to the selected non-Production profile. |
| `npm run verify:production-like` | Require an absent clean Verification inventory, then build, start database/application/Nginx, apply migrations explicitly, run every ordered result, perform exact current-run cleanup, validate nondisclosure/report completeness, atomically emit the report and parity statement, and return non-zero if any result fails. |
| `npm run check` | Run deterministic typecheck, lint/static/import-boundary checks, independent builds, focused diagnostic/HTTP/database/profile tests, and `security:check`; return non-zero on failure. |
| `npm run security:secrets` | Prove the pinned Gitleaks scanner with an ephemeral detectable canary, then scan tracked content; a failed canary or detected committed secret is blocking. |
| `npm run security:dependencies` | Review the locked npm graph for vulnerabilities and require explicit relevance/severity/reachability/mitigation triage for actionable findings. |
| `npm run security:asvs` | Validate every applicable foundation ASVS 5.0.0 matrix row has applicability, implementation, verification, and evidence; authentication/session rows must carry the FR-016 not-applicable rationale. |
| `npm run security:check` | Run secrets, dependency, and ASVS gates; return non-zero for a secret, unreviewed actionable dependency finding, or incomplete evidence. |

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
| forbidden environment/profile/credential/resource combination | `CONFIG_PROFILE_CONFLICT` |

## Safe diagnostic contract

Every failure emitted on command standard output/error, application logs, surfaced container/proxy
logs, HTTP errors/readiness components, or Verification reports has exactly this logical shape:

```json
{
  "reasonCode": "ALLOWLISTED_CODE",
  "profile": "foundation | daily | verification",
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

## Profile ownership and isolation

- Development and Verification use exact, different Compose project names, networks, credentials,
  database names, and named volumes.
- Development publishes database access to loopback only. Verification publishes only Nginx; its
  application and database ports remain internal.
- Routine `stop` never removes the Development volume.
- Every manifest resource carries canonical Compose labels plus the complete custom label set
  `org.songhealth.foundation.delivery`, `.checkout`, `.profile`, `.resource`, and
  `.ownership-schema`.
- Mutation is allowed only when typed inspection proves exact expected type/name, checkout-scoped
  project, manifest membership, all canonical/custom labels, and expected attachments/mounts. A
  second inventory under the profile lock must match the action-bound confirmation digest.
- Ambiguous, stale/colliding, mislabeled, unexpectedly active/attached, token-mismatched, or changed
  resources are read-only refusal states. No confirmation token is issued; remediation is bounded to
  safe inspection/manual ownership review.
- Reset/recovery/cleanup removes recorded exact resources individually and never uses name prefixes,
  wildcards, label-filter deletion, `--remove-orphans`, broad `down --volumes`, prune, unresolved
  variables, or force removal.
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
configuration-cross-profile-rejected,
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
  signal exit semantics, and leaves the profile stopped or not-ready.
- Journals are ignored mode-`0600` files at `.foundation-state/<profile>/operation.json`; atomic
  Verification reports are written under `.foundation-state/reports/`. Both contain only normalized
  state and Safe Diagnostics, never protected values or raw tool output.
- On the next invocation, an unclosed `running` journal is treated as interrupted. Non-destructive
  retry is allowed only after status/inventory proves it safe; destructive reset/recovery/cleanup
  requires a fresh matching token. Interrupted migration is status-checked and never auto-reset.
- Cleanup/recovery cannot replace the immutable primary failure. Main failure plus cleanup failure
  reports both; main success plus cleanup failure makes cleanup primary, and reporting is primary
  only when every earlier result passed.
- Ownership that cannot be proven returns `RESOURCE_OWNERSHIP_UNPROVEN` without mutation. Inventory
  drift returns `RESOURCE_INVENTORY_CHANGED`. Diagnostics use only the safe contract and bounded
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

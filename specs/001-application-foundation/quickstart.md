# Quickstart Validation: Application Foundation & Development Runtime

This guide defines runnable acceptance scenarios for the completed foundation. Commands are
repository contracts from [foundation-operations.md](contracts/foundation-operations.md). HTTP
responses follow [foundation-http.openapi.yaml](contracts/foundation-http.openapi.yaml), security
evidence follows [foundation-security.md](contracts/foundation-security.md), and profile state
follows [data-model.md](data-model.md).

## Prerequisites and timing boundaries

Use a clean checkout with Node.js 24.x/npm, Podman plus a working Compose provider, documented
loopback ports available, and all required container/security-scanner images already local. Only
synthetic or explicitly approved non-Production fixtures are accepted. Any Production-derived data,
including sanitized or minimized copies, is rejected; an exception requires separately approved
scope.

The Development timer begins immediately before the `npm ci` command below and ends only after
configuration preparation, preflight, database creation, explicit migration, native application
startup, and a passing overall `dev:ready`. Checkout acquisition, external-tool acquisition, and
required-image acquisition are the only exclusions.

The Verification timer begins when the single `npm run verify:production-like` command is invoked,
with release-candidate source, Verification configuration, external tools, and required images
already local. It ends only after build, all twenty results including cleanup, and atomic final
report emission. Configuration copy is a prerequisite; build is inside the timer.

## 1. Prepare and start Development

```bash
npm ci
cp .env.development.example .env.development.local
npm run foundation:check
npm run dev:setup
npm run dev:start
npm run dev:ready
```

Expected outcomes:

- unsafe tooling, configuration, ownership, or port state fails before application work;
- only the Development database dependency runs in Podman, bound to loopback with Development-only
  credentials; the Public, Admin, and server processes run natively;
- tracked migrations are `current` and ordinary startup did not auto-apply them;
- liveness, readiness, Public SSR HTML, and the separate Admin CSR shell pass at documented URLs;
- repeated `dev:start` creates no duplicate process or resource;
- the complete procedure passes within 20 minutes.

## 2. Prove persistence, inventory safety, and explicit reset

Capture normalized resource inventories, then obtain an action-bound reset token:

```bash
npm run foundation:inventory -- --profile development --action status
npm run foundation:inventory -- --profile verification --action status
RESET_TOKEN="$(npm run --silent foundation:inventory -- --profile development --action reset --token-only)"
npm run dev:persistence-check -- --confirm "$RESET_TOKEN"
npm run dev:ready
npm run foundation:inventory -- --profile development --action status
npm run foundation:inventory -- --profile verification --action status
```

Expected outcomes:

- one Delivery-owned synthetic, non-sensitive marker is written before routine stop/restart and the
  exact value is read after restart;
- reset re-inventories under the Development lock, accepts only the still-current token, changes
  only the exactly confirmed Development datastore, reapplies tracked migrations, and proves the
  prior marker row absent;
- before/after inventories expose only normalized ownership/profile identifiers, digests, and state;
- Verification and every non-target resource remain unchanged and untargeted;
- missing, mismatched, ambiguous, stale, mislabeled, or unexpectedly active/attached targets refuse
  mutation; no wildcard, prune, force, `--remove-orphans`, or broad volume deletion is used.

## 3. Prove configuration rejection and nondisclosure

With Development stopped, exercise a required key/value fixture for each class:

```text
missing                 -> CONFIG_MISSING
empty                   -> CONFIG_EMPTY
malformed               -> CONFIG_MALFORMED
unsupported enum/value  -> CONFIG_UNSUPPORTED
out of range            -> CONFIG_OUT_OF_RANGE
cross-profile conflict  -> CONFIG_PROFILE_CONFLICT
```

For each fixture run the relevant preflight/start command and the focused diagnostic tests.
Expected outcomes:

- failure occurs before a database pool, listener, child service, or other work is accepted;
- command stdout/stderr, application logs, surfaced container/proxy logs, HTTP/readiness failures,
  component failures, and Verification results all use the same closed Safe Diagnostic shape;
- allowlisted reason, profile, component, optional safe key name, and bounded remediation are the
  only fields; raw child-process/Compose/Podman/Nginx/database output is never passed through;
- unique forbidden sentinels are absent in exact and encoded form from every surface.

Repeat provenance validation with `synthetic`, an explicitly approved non-Production fixture, and a
`production-derived` fixture. Only the first two can pass; sanitized/minimized Production-derived
content remains invalid.

## 4. Prove explicit migration readiness

```bash
npm run db:status -- --profile development
npm run db:migrate -- --profile development
npm run db:status -- --profile development
```

`status` never mutates. `migrate` is explicit and reports each tracked migration, including the
minimal foundation-operational persistence-marker migration. The final state is `current`; pending
migrations make readiness fail. The marker table is operational test evidence, not Product data.

## 5. Prove interrupted-operation recovery

Run controlled local fault injection for `start`, `stop`, `migrate`, `reset`, and `cleanup` using the
acceptance-only interface, changing the profile/action/phase to each documented allowlisted case:

```bash
npm run foundation:test-interruption -- --profile development --action start --phase after-journal
npm run foundation:status -- --profile development
npm run foundation:inventory -- --profile development --action recover --operation start
RECOVERY_TOKEN="$(npm run --silent foundation:inventory -- --profile development --action recover --operation start --token-only)"
npm run foundation:recover -- --profile development --operation start --confirm "$RECOVERY_TOKEN"
```

Expected outcomes:

- each operation is exclusive per profile, journals before mutation, handles signals/failures in a
  `finally` cleanup path, and ends stopped or not-ready on interruption;
- the first failure remains primary and any cleanup/recovery failure is additional;
- safe non-destructive retry is allowed only when inventory proves it; destructive recovery/reset/
  cleanup requires a fresh exact token;
- an ungraceful interruption leaves an open journal that the next invocation detects. Orphaned,
  ambiguous, changed, or ownership-unproven state is read-only and refused until exact ownership is
  reviewed and explicitly confirmed.

Repeat the same pattern for Verification cleanup, proving Development inventory is untouched.

## 6. Run Production-like Verification independently

Development may be stopped or running. Copy the safe Verification example before starting the
Verification timer:

```bash
cp .env.verification.example .env.verification.local
npm run verify:production-like
```

The operation requires an absent clean Verification inventory; it does not silently pre-clean stale
resources. It emits these ordered results, each exactly `PASS` or `FAIL`:

```text
build
startup
configuration-valid
configuration-missing-rejected
configuration-empty-rejected
configuration-malformed-rejected
configuration-unsupported-rejected
configuration-out-of-range-rejected
configuration-cross-profile-rejected
migration
database
liveness
readiness
isolation
proxy
public-route
admin-route
server-route
cleanup
reporting
```

A blocked downstream result is `FAIL` with a safe `PREREQUISITE_FAILED` diagnostic, never missing or
skipped. Cleanup runs after main checks; final completeness/schema/nondisclosure validation and
atomic report emission run afterward. The first main failure remains primary, cleanup/reporting
failures are additional. Cleanup becomes primary only if all earlier results passed; reporting is
primary only if every earlier result passed. Overall `PASS` requires all twenty results to pass and
completes within 10 minutes.

Only Nginx is published to the host; application/database endpoints remain internal. The proxy,
routes, database, migrations, isolation, diagnostics, and cleanup pass without touching Development.
The final report explicitly states that local success does not establish exact Bangmod/Plesk parity.

## 7. Run security and common quality gates

```bash
npm run security:secrets
npm run security:dependencies
npm run security:asvs
npm run security:check
npm run check
```

Expected outcomes:

- the pinned one-shot Gitleaks v8.29.1 image detects its ephemeral synthetic canary and finds no
  committed secret;
- the locked dependency graph has no unreviewed actionable finding;
- every applicable foundation ASVS 5.0.0 row has applicability, implementation, verification, and
  evidence; selected L2 rows include risk rationale, and auth/session is explicitly N/A under
  FR-016;
- typecheck, lint/static/import boundaries, independent builds, diagnostic nondisclosure,
  HTTP/readiness, real database/migration, and profile/proxy/route checks have discoverable non-zero
  failure behavior;
- no result claims blanket ASVS compliance, Production hosting readiness, or exact parity.

## 8. Repeat and stop

Repeat the persistence/reset scenario and the complete Verification command twice from independently
clean states. Both runs must pass without an undocumented corrective step, shared mutable data,
duplicate resources, absent results, or ambiguous ownership.

```bash
npm run dev:stop
```

Development containers stop while its named volume remains. No command in this guide implements
Product schema, APIs, authentication, authorization, editorial workflow, or domain behavior.

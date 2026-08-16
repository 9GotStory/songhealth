# Implementation Plan: Application Foundation & Development Runtime

**Branch**: `001-application-foundation` | **Date**: 2026-08-16 | **Spec**: [spec.md](spec.md)

**Input**: Approved feature specification from `specs/001-application-foundation/spec.md`

## Summary

Create the smallest runnable TypeScript workspace that establishes the three approved application
boundaries without adding Product behavior: a React Router Framework Mode public SSR application,
a separate React/Vite Admin CSR shell, and a Fastify server/bootstrap boundary. Release-shaped
execution uses one Node.js process: a thin Public composition entry creates Fastify, registers the
server-owned foundation plugin/capabilities, serves the built Admin assets, and hands Public routes
to the React Router request handler without making Server depend on frontend source.

Daily Development runs Node.js/React/Vite natively and starts only a Podman-managed provisional
MySQL 8.4 LTS database with a persistent named volume. Production-like Verification uses an
independent, disposable Podman project containing Nginx, the production-built application image,
and a separate MySQL-compatible database. Startup validates configuration before listening,
readiness includes database connectivity and migration status, migrations remain explicit, and
all output surfaces use one allowlisted diagnostic contract rather than secrets, raw exceptions,
or infrastructure details. Guarded lifecycle operations journal their progress, refuse ambiguous
ownership, preserve the primary failure, and bind destructive confirmation to an exact resource
inventory. Persistence acceptance uses one foundation-operational synthetic marker plus before/
after inventories; Verification emits every required build-through-cleanup result before its final
report.

## Technical Context

**Language/Version**: ESM TypeScript 5.x on Node.js 24.x LTS for Development and Verification
(target workstation: Node.js 24.19.0 and npm 12.0.2); Production Node.js remains evidence-dependent
on Bangmod inspection

**Primary Dependencies**: npm 12 workspaces; Fastify 5; TypeBox/JSON Schema; React 19.2+; React Router
8 Framework Mode; Vite 8; Kysely with `mysql2`; Vitest and ESLint flat configuration for the
applicable quality gates; no workspace orchestrator, DI container, or shared package baseline

**Storage**: Provisional MySQL 8.4 LTS/InnoDB/`utf8mb4` for local and Verification, accessed through
Kysely; one operational migration creates only the synthetic persistence-marker table required by
SC-002, with no Product/domain tables; exact Production MySQL/MariaDB version and collation remain
unresolved pending host inspection

**Testing**: Vitest for configuration, readiness, orchestration, and application tests; Fastify
`inject()` for HTTP contracts; HTTP/render/proxy checks through Nginx; real MySQL-compatible
integration checks under Podman; no browser-journey suite until Product behavior exists

**Target Platform**: Maintainer workstation with Node.js 24, npm, Podman, and a configured Compose
provider; verification container targets Linux/Node.js 24; Production remains Bangmod Expert
Hosting with its hosting-managed proxy/runtime

**Project Type**: One-repository web application / Node.js Modular Monolith with three application
workspaces (`apps/web`, `apps/admin`, `apps/server`)

**Performance Goals**: Development completes within 20 minutes from the first repository setup
command through overall readiness after the checkout, external tools, and required images are local;
Verification completes within 10 minutes from its single command through build, every contract
result, exact cleanup, and final report after source/config/tools/images are local; two consecutive
clean runs produce the same result inventory

**Constraints**: No Product behavior, authentication, domain schema, or speculative services;
Development database is loopback-only; profiles never share credentials or mutable data; only
synthetic or explicitly approved non-Production fixtures are accepted and Production-derived data
is rejected; all configuration rejection classes fail before pool/listener/work acceptance;
migrations never auto-run at application startup; Verification success never claims Production
parity; destructive operations require an unchanged exact ownership inventory and never use broad,
wildcard, prune, orphan, or force deletion

**Scale/Scope**: Three application workspaces, one database dependency, two local runtime profiles,
two operational health endpoints, one Public foundation route, one Admin foundation route, and no
shared packages until real reuse exists

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle / gate | Pre-design evaluation | Post-design evaluation |
|---|---|---|
| I. Security First | PASS — configuration is fail-closed, secrets stay outside Git, the Development database is local-only, and proxy trust is profile-bounded. | PASS — one closed diagnostic schema covers every output surface; exact inventory-bound mutation, committed-secret detection, dependency review, and the ASVS 5.0.0 evidence contract make controls reviewable. |
| II. Simple — Structured — Sustainable | PASS — ordinary npm workspaces and the three required apps are sufficient; no Nx/Turborepo, shared package, DI container, or speculative service is introduced. | PASS — one release-shaped Node process and two profile-specific small manifests satisfy the required boundaries without distributed runtime or empty hierarchy. |
| III. Requirement-Driven Architecture and Traceability | PASS — every planned boundary traces to FR-001–FR-017 and the Plan-routed Frozen decisions. | PASS — the only new persisted object is the SC-002 operational marker; all other additions are exact configuration, lifecycle, diagnostic, security-evidence, or Verification contracts. |
| IV. Privacy and Data Minimization | PASS — only synthetic/non-Production data is permitted and no Product data model is created. | PASS — fixture provenance rejects even sanitized Production-derived input in this Delivery, and every failure surface is tested against the forbidden-output taxonomy. |
| V. Quality and Proportionate Verification | PASS — the plan uses the lowest useful test layer plus real-engine and bounded HTTP/proxy verification. | PASS — the quickstart measures exact timing boundaries and proves marker continuity/reset, every configuration class and output surface, all Verification results, recovery, secret/dependency gates, and ASVS evidence without arbitrary coverage or premature Product E2E. |
| VI. Operational Sustainability | PASS — supported LTS runtime, explicit lifecycle commands, actionable health, and small version-controlled manifests fit the approved environment. | PASS — atomic safe journals, immutable primary failures, explicit recovery, inventory-bound cleanup, and provisional hosting values make failures recoverable without broad automation. |
| Delivery and Quality Gates | PASS — approved spec and routed authority were read before design; no implementation or future Delivery scope is authorized. | PASS — Phase 1 artifacts are complete, no Constitution exception is needed, and the workflow stops before Tasks. |

## Project Structure

### Documentation (this feature)

```text
specs/001-application-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── foundation-http.openapi.yaml
    ├── foundation-operations.md
    └── foundation-security.md
```

`tasks.md` is intentionally not created by this Plan phase.

### Source Code (repository root)

```text
apps/
├── web/
│   ├── app/
│   │   ├── root.tsx
│   │   ├── routes.ts
│   │   └── routes/
│   │       ├── foundation.tsx
│   │       └── foundation.test.tsx
│   ├── react-router.config.ts
│   ├── server.ts
│   ├── vite.config.ts
│   └── package.json
├── admin/
│   ├── src/
│   │   ├── app.tsx
│   │   ├── app.test.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── server/
    ├── src/
    │   ├── bootstrap.ts
    │   ├── config.ts
    │   ├── config.test.ts
    │   ├── database.ts
    │   ├── health.ts
    │   ├── health.test.ts
    │   ├── http.ts
    │   ├── migrations.ts
    │   ├── migrations.test.ts
    │   └── migrations/
    │       └── 001-foundation-persistence-marker.ts
    └── package.json

infra/
├── Containerfile
├── compose.development.yaml
├── compose.verification.yaml
└── nginx/
    └── nginx.conf

scripts/
├── foundation-operations.mjs
├── foundation-operations.test.ts
├── security-gates.mjs
└── security-gates.test.ts

tests/
└── verification/
    ├── diagnostic-surfaces.test.ts
    ├── foundation-profile.test.ts
    └── lifecycle-recovery.test.ts

docs/
└── security/
    └── asvs-foundation-evidence.md

.env.development.example
.env.verification.example
.gitignore
package.json
package-lock.json
tsconfig.json
eslint.config.js
```

**Structure Decision**: Use only the Frozen `apps/web`, `apps/admin`, and `apps/server` boundaries.
The server remains deliberately shallow because this Delivery has no business modules. Foundation
startup/configuration/database/health files have immediate responsibilities and therefore do not
create an empty `modules/` tree. `packages/` is omitted until a later Delivery proves genuine reuse.
The root operation script is developer/runtime orchestration only; it contains no Product logic.

## Design Decisions

### Runtime composition

- `apps/server` exports the server-owned configuration, database composition, migration status,
  operational routes, and future Application capabilities as an explicit Fastify plugin/composition
  boundary. It never imports Public or Admin source/build output.
- `apps/web/server.ts` is the thin presentation composition entry for daily and release-shaped
  execution. It creates the Fastify listener, registers the Server boundary first, serves Admin and
  Public build assets, then adapts remaining Public requests to the React Router server build. The
  adapter uses React Router's official Node request listener against Fastify's raw request/reply
  after an explicit handoff. Because Fastify `reply.hijack()` bypasses remaining normal reply
  processing, security headers and response mutation happen before handoff or inside the React
  Router response; mandatory tests cover GET/HEAD, streaming, redirects, errors, aborts, repeated
  headers, and security-header/logging ownership at that boundary.
- Future Public loaders receive server-owned capabilities through React Router load context for
  in-process calls. This Delivery supplies no Product capability and creates no localhost API call
  or shared-core package merely to demonstrate that extension point.
- Daily Development uses the native Public/Fastify/Vite composition plus the separate Admin Vite
  process behind one documented root command. This preserves hot reload without making application
  containers part of the daily baseline.
- Public and Admin foundation routes contain only boundary/readiness copy. They are not templates
  for Product navigation, authentication, CMS workflow, or domain UI.

### Configuration and startup

- `APP_ENVIRONMENT` (`development`, `staging`, `production`) stays distinct from
  `RUNTIME_PROFILE` (`daily`, `verification`, `hosted`), so Verification is not modeled as a fourth
  authoritative environment.
- A TypeBox-backed configuration schema validates the complete configuration before Fastify calls
  `listen()` or creates the pool. Missing, empty, malformed, unsupported, out-of-range, and forbidden
  cross-profile combinations map respectively to `CONFIG_MISSING`, `CONFIG_EMPTY`,
  `CONFIG_MALFORMED`, `CONFIG_UNSUPPORTED`, `CONFIG_OUT_OF_RANGE`, and
  `CONFIG_PROFILE_CONFLICT`.
- Commands, standard output/error, application and surfaced container/proxy logs, HTTP failures,
  readiness components, and Verification reports use the same closed `SafeDiagnostic` shape:
  allowlisted reason code, profile, component, optional safe configuration-key name, and allowlisted
  remediation. Raw child-process output is never passed through; serializers/adapters map it to the
  contract, and sentinel tests scan every named surface.
- Verification trusts exactly one proxy hop while the application port remains internal to its
  Compose network. Daily Development does not trust forwarded headers. Hosted proxy trust remains
  unset until the real Bangmod chain is inspected.

### Persistence and migrations

- MySQL 8.4 LTS is a provisional local/Verification engine, pinned by an immutable digest resolving
  specifically to `mysql:8.4`; floating `mysql:lts`/`latest` tags are prohibited because `lts` may
  move to another major. This is not a claim about Bangmod's database vendor or version.
- Development and Verification use separate manifests, different credentials, checkout-scoped
  Compose project names, networks, and named volumes. Only the Development volume persists across
  routine stop/restart.
- Kysely's explicit migrator command owns `apply` and `status`; current migration APIs are imported
  from `kysely/migration`. Application startup never applies migrations and refuses readiness when
  tracked migrations are pending. One version-controlled operational migration creates the minimum
  `foundation_persistence_marker` table; it stores only a synthetic acceptance marker and is not a
  Product/domain schema or seed.
- Runtime profile validation accepts fixture provenance `synthetic` or `approved-non-production`
  only. `production-derived` is invalid in both local profiles even when claimed sanitized; a future
  exception requires a separately approved Delivery change.

### Operations and verification

- One checked operation entry point exposes prerequisite check, setup, start, readiness, stop,
  restart, persistence proof, inventory, confirmed reset/recovery, and a self-contained Verification
  run. A mode-`0600` ignored per-profile journal is atomically updated across phases and keeps the
  first failure immutable from later cleanup/recovery failures. Runtime state lives only under the
  ignored checkout-local `.foundation-state/`: one `<profile>/operation.json` journal and atomic
  `reports/<run-id>.json` Verification output. Each journal embeds the checkout-scope digest, and no
  protected value or raw tool output is stored there.
- Ownership requires exact type/name, checkout-scoped project, manifest allowlist, canonical Compose
  labels, complete project reverse-DNS labels, and expected attachment/mount state. Read-only
  inventory hashes that conjunction into an action-specific confirmation token; mutating commands
  lock, re-inventory, and refuse drift, collision, missing/mislabeled ownership, or unexpected use.
  Exact resources are removed individually without wildcard, label-filter, orphan, prune, broad
  volume, or force operations.
- Development persistence proof writes one non-sensitive marker, proves its value after routine
  restart, performs an inventory-confirmed reset, then proves the old row is absent, migrations are
  current, and only Development datastore resources changed. Interrupted operations leave the
  profile stopped or not-ready and route through documented status/inventory/retry/recover actions.
- Verification requires an absent clean inventory or explicit inventory-confirmed recovery; it does
  not auto-remove stale resources. It emits exactly these ordered PASS/FAIL results: `build`,
  `startup`, `configuration-valid`, `configuration-missing-rejected`,
  `configuration-empty-rejected`, `configuration-malformed-rejected`,
  `configuration-unsupported-rejected`, `configuration-out-of-range-rejected`,
  `configuration-cross-profile-rejected`, `migration`, `database`, `liveness`, `readiness`,
  `isolation`, `proxy`, `public-route`, `admin-route`, `server-route`, `cleanup`, and `reporting`.
  Blocked later checks are explicit `PREREQUISITE_FAILED` failures. Cleanup/reporting never replace
  an earlier primary failure; if no earlier result failed, the first cleanup or reporting failure is
  primary. The atomic final report is emitted only after cleanup and nondisclosure/schema validation.
- An acceptance-only, synthetic-profile fault-injection entry point exercises interrupted start,
  stop, migration, reset, and cleanup at allowlisted phases. It cannot run against hosted or
  Production-derived configuration; the resulting journal, inventory, refusal/retry, and confirmed
  recovery paths are part of lifecycle verification rather than a general-purpose chaos system.

### Testing and security evidence

- Root quality entry points cover TypeScript typecheck, ESLint/static/import-boundary checks, three
  independent builds,
  focused diagnostic/configuration/HTTP tests, real-engine migration and persistence tests,
  profile/proxy/route verification, a one-shot Gitleaks v8.29.1 scan pinned to the GHCR multi-platform
  manifest digest `sha256:aa036a2f4bdfe3cc3c55fa4326308efabb4a6be498c883c864fd1d0d5585438a`,
  locked-graph dependency vulnerability review with explicit triage, and completeness validation of
  `docs/security/asvs-foundation-evidence.md`. The secret gate first proves the scanner with an
  ephemeral synthetic canary expected to fail, then scans tracked content.
- The ASVS artifact records versioned requirement ID, level, applicability/rationale,
  implementation, verification, and evidence. Applicable ASVS 5.0.0 Level 1 requirements are the
  floor; selected Level 2 controls cover this Delivery's proxy, configuration, data-disclosure,
  logging, and error risks. Authentication/session controls are explicitly not applicable under
  FR-016, and no blanket ASVS compliance claim is made.
- No coverage percentage or Playwright Product journey is added. HTTP/build/inject/real-engine and
  lifecycle checks remain the lowest layers that directly prove this Delivery's invariants.

## Complexity Tracking

No Constitution violations or exceptions require justification.

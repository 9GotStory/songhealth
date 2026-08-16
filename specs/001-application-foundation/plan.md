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
all ordinary output uses safe reason codes rather than secrets or internal errors.

## Technical Context

**Language/Version**: ESM TypeScript 5.x on Node.js 24.x LTS for Development and Verification;
Production Node.js version remains evidence-dependent on Bangmod inspection

**Primary Dependencies**: npm 12 workspaces; Fastify 5; TypeBox/JSON Schema; React 19.2+; React Router
8 Framework Mode; Vite 8; Kysely with `mysql2`; no workspace orchestrator, DI container, or shared
package baseline

**Storage**: Provisional MySQL 8.4 LTS/InnoDB/`utf8mb4` for local and Verification, accessed through
Kysely; no Product/domain tables in this Delivery; exact Production MySQL/MariaDB version and
collation remain unresolved pending host inspection

**Testing**: Vitest for configuration, readiness, orchestration, and application tests; Fastify
`inject()` for HTTP contracts; HTTP/render/proxy checks through Nginx; real MySQL-compatible
integration checks under Podman; no browser-journey suite until Product behavior exists

**Target Platform**: Maintainer workstation with Node.js 24, npm, Podman, and a configured Compose
provider; verification container targets Linux/Node.js 24; Production remains Bangmod Expert
Hosting with its hosting-managed proxy/runtime

**Project Type**: One-repository web application / Node.js Modular Monolith with three application
workspaces (`apps/web`, `apps/admin`, `apps/server`)

**Performance Goals**: Clean-checkout Development readiness within 20 minutes excluding prerequisite
downloads; complete Production-like Verification within 10 minutes; two consecutive clean profile
runs produce the same pass/fail contracts

**Constraints**: No Product behavior, authentication, domain schema, or speculative services;
Development database is loopback-only; profiles never share credentials or mutable data; startup
fails before listening on invalid configuration; migrations never auto-run at application startup;
Verification success never claims Production parity; reset operations target only the exact
Delivery-owned local profile

**Scale/Scope**: Three application workspaces, one database dependency, two local runtime profiles,
two operational health endpoints, one Public foundation route, one Admin foundation route, and no
shared packages until real reuse exists

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle / gate | Pre-design evaluation | Post-design evaluation |
|---|---|---|
| I. Security First | PASS — configuration is fail-closed, secrets stay outside Git, the Development database is local-only, and proxy trust is profile-bounded. | PASS — contracts require redacted diagnostics, exact reset targets, non-published app/database ports in Verification, and safe readiness codes. |
| II. Simple — Structured — Sustainable | PASS — ordinary npm workspaces and the three required apps are sufficient; no Nx/Turborepo, shared package, DI container, or speculative service is introduced. | PASS — one release-shaped Node process and two profile-specific small manifests satisfy the required boundaries without distributed runtime or empty hierarchy. |
| III. Requirement-Driven Architecture and Traceability | PASS — every planned boundary traces to FR-001–FR-017 and the Plan-routed Frozen decisions. | PASS — the data model and contracts introduce only foundation configuration, health, profile lifecycle, and verification concepts. |
| IV. Privacy and Data Minimization | PASS — only synthetic/non-Production data is permitted and no Product data model is created. | PASS — profile contracts prohibit shared Production-derived data and Verification results exclude protected values. |
| V. Quality and Proportionate Verification | PASS — the plan uses the lowest useful test layer plus real-engine and bounded HTTP/proxy verification. | PASS — the quickstart proves startup, persistence, reset, isolation, configuration failure, migration readiness, route reachability, and parity disclaimers. |
| VI. Operational Sustainability | PASS — supported LTS runtime, explicit lifecycle commands, actionable health, and small version-controlled manifests fit the approved environment. | PASS — commands are repeatable, cleanup is scoped, migrations are explicit, and hosting-dependent values remain provisional. |
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
    └── foundation-operations.md
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
│   │       └── foundation.tsx
│   ├── react-router.config.ts
│   ├── server.ts
│   ├── vite.config.ts
│   └── package.json
├── admin/
│   ├── src/
│   │   ├── app.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── server/
    ├── src/
    │   ├── bootstrap.ts
    │   ├── config.ts
    │   ├── database.ts
    │   ├── health.ts
    │   ├── http.ts
    │   └── migrations.ts
    └── package.json

infra/
├── Containerfile
├── compose.development.yaml
├── compose.verification.yaml
└── nginx/
    └── nginx.conf

scripts/
└── foundation-operations.mjs

tests/
└── verification/
    └── foundation.test.ts

.env.development.example
.env.verification.example
package.json
package-lock.json
tsconfig.json
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
  after an explicit handoff; focused tests cover GET/HEAD, streaming, redirects, errors, aborts,
  repeated headers, and security-header/logging ownership at that boundary.
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
  `listen()`. Sensitive fields are registered for log redaction; user-facing failures expose a
  stable reason code and configuration key name only when safe.
- Verification trusts exactly one proxy hop while the application port remains internal to its
  Compose network. Daily Development does not trust forwarded headers. Hosted proxy trust remains
  unset until the real Bangmod chain is inspected.

### Persistence and migrations

- MySQL 8.4 LTS is a provisional local/Verification engine, pinned by an immutable image digest in
  implementation. It is not a claim about Bangmod's database vendor or version.
- Development and Verification use separate manifests, different credentials, checkout-scoped
  Compose project names, networks, and named volumes. Only the Development volume persists across
  routine stop/restart.
- Kysely's explicit migrator command owns `apply` and `status`. Application startup never applies
  migrations and refuses readiness when tracked migrations are pending. This Delivery creates no
  Product/domain migration; Kysely-owned migration metadata is operational tooling state only.

### Operations and verification

- One checked operation entry point exposes prerequisite check, setup, start, readiness, stop,
  restart, and explicit reset for Development plus a self-contained Verification run.
- Reset requires the exact `development` profile token, stops its database container first, and
  removes only the known Delivery-owned Development volume; broad volume deletion and force flags
  are prohibited.
- Verification starts from its own clean volume, builds the release candidate, applies migrations
  explicitly, starts Nginx/application/database, waits for readiness, runs distinct contract
  checks, emits one result per check, repeats without daily-profile dependencies, and tears down
  only its own project resources.

## Complexity Tracking

No Constitution violations or exceptions require justification.

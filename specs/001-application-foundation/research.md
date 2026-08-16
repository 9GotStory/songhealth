# Phase 0 Research: Application Foundation & Development Runtime

All implementation-affecting unknowns are resolved for this Delivery. Production runtime,
database vendor/version/collation, and hosting proxy values remain intentionally evidence-dependent
deployment decisions; the design does not require them to implement or validate the local
foundation.

## Decision 1: Node.js 24 LTS with npm workspaces

**Decision**: Use the installed Node.js 24.x LTS and npm 12.x toolchain for Development and
Production-like Verification. Define one private root package with `workspaces: ["apps/*"]`, three
application workspaces, and one committed root `package-lock.json`. Use `npm ci` after the lockfile
is created. Treat the selected Node major as provisional for local/Verification only until Bangmod
runtime inspection confirms Production support.

**Rationale**: Node.js 24 is a supported LTS line and already exists on the target workstation.
npm's native workspace support provides root installation, local workspace linking, targeted
commands, and all-workspace commands without another package manager or monorepo layer. This is the
smallest tooling that enforces the approved application boundaries.

**Alternatives considered**:

- pnpm or Yarn: capable, but introduce an additional uninstalled tool with no current requirement.
- Bun: changes the approved runtime/toolchain without evidence.
- Nx, Turborepo, remote caches, or package publishing: explicitly excluded until real complexity
  justifies them.
- independent repositories or lockfiles: conflict with one coordinated application/release.

## Decision 2: Resolve and lock compatible dependency versions during implementation

**Decision**: Use the current compatible major baseline—ESM TypeScript 5.x, Fastify 5, React 19.2+,
React Router 8 Framework Mode, and Vite 8—plus TypeBox/JSON Schema, Kysely, `mysql2`, and Vitest.
Resolve compatible package releases when the workspace is scaffolded and commit exact transitive
resolution in `package-lock.json`; do not freeze package patch versions in Source-of-Truth or
feature design.

**Rationale**: The architecture fixes technology choices but deliberately leaves exact package
versions as implementation/deployment decisions. Locking the compatible graph makes builds
reproducible while avoiding a stale architectural constant. Context7 confirmed the current
React Router 8's Node request-listener/custom-server model and Node 24 requirement, Fastify proxy/
test/raw-reply primitives, and Kysely's explicit migrator APIs.

**Alternatives considered**:

- hard-code remembered latest versions in the plan: unnecessary and vulnerable to version drift.
- floating installs without a lockfile: not reproducible.
- replace approved dependencies with other frameworks: outside this Delivery's authority.

## Decision 3: One release-shaped listener with framework adapters at the edge

**Decision**: In release-shaped execution, a thin `apps/web` presentation composition entry creates
the only Node/Fastify listener. It registers an exported `apps/server` foundation plugin/capability
boundary, then Admin assets/fallback, Public assets, and the React Router Framework Mode server
build through React Router's official Node request listener and a small Fastify raw-response
handoff. `apps/server` owns validated configuration, database composition, migration status, and
operational routes but never imports frontend source/build output. Future Public loaders receive
server-owned capabilities through React Router load context rather than networking back into the
same process.

Daily Development runs the Fastify and Vite development processes natively behind one supervised
root command. The Public and Admin outputs are minimal foundation-only routes.

**Rationale**: React Router Framework Mode produces a server build that is a request handler for a
custom JavaScript server. The Public composition preserves Presentation → Application dependency
direction while Fastify remains the single release listener and Server remains authoritative for
backend capabilities. A small adapter is less complex than an internal network boundary or an
additional framework.

**Alternatives considered**:

- separate Public SSR and Fastify network services: adds process, routing, failure, and localhost
  HTTP complexity that the Modular Monolith rejects.
- Express solely for an official React Router adapter: duplicates/replaces the accepted Fastify
  boundary.
- pure CSR Public application: violates the meaningful-initial-HTML/SSR baseline.
- add a shared Application Core package now: no Product capability exists to share.

The absence of an official Fastify-specific React Router adapter is a bounded implementation risk.
Focused adapter tests must cover GET/HEAD, streaming SSR, redirects, errors, aborts, repeated
headers, and logging/security-header ownership before the release-shaped profile can pass.

## Decision 4: Provisional MySQL 8.4 LTS for local and Verification

**Decision**: Use a MySQL 8.4 LTS container image for Development and Verification, pinned to an
immutable image digest during implementation and labeled provisional. Configure InnoDB and
`utf8mb4`; do not freeze Production vendor/version, collation, pool size, or compatibility claims.

**Rationale**: A real MySQL-compatible engine is required for database-sensitive verification.
MySQL 8.4 is an LTS series with stable behavior within the series, so it is a conservative local
choice while Bangmod's actual MySQL/MariaDB service remains unknown.

**Alternatives considered**:

- MariaDB chosen by guess: may diverge from the uninspected host just as easily.
- an innovation MySQL line: unnecessary churn for a foundation.
- SQLite/in-memory database: cannot prove the accepted real-engine connectivity/migration path.
- a native host database: introduces workstation service drift and makes reset less safe.

## Decision 5: Separate Development and Verification manifests and ownership

**Decision**: Use `infra/compose.development.yaml` for the Development database only and
`infra/compose.verification.yaml` for Nginx, the production-built application, and its independent
database. A guarded Node orchestration script derives stable checkout-scoped `development` and
`verification` project names, validates ownership labels, explicitly sequences/polls components,
and performs cleanup in a `finally` path.

Development publishes its database only to loopback and preserves its named volume on routine
stop. Verification publishes only Nginx; its app/database remain network-internal and its volume is
removed before and after each run.

**Rationale**: Two small manifests make data ownership and port exposure structurally distinct and
allow the profiles to coexist. Podman's `compose` command delegates to an external Compose provider,
so preflight must verify that provider and orchestration cannot rely solely on provider-dependent
health-condition behavior.

**Alternatives considered**:

- one manifest with profiles: fewer files, but easier accidental sharing of volumes, credentials,
  or published ports.
- fixed global project names: collide across checkouts.
- random project names: accumulate orphaned resources and obscure ownership.
- raw broad cleanup/prune commands: unsafe and prohibited.
- containerize daily Node/Vite applications: no daily-development value justifies it.

## Decision 6: Fail-closed typed configuration and bounded proxy trust

**Decision**: Parse the full runtime configuration through a TypeBox-backed schema before opening
the database pool or listener. Keep `APP_ENVIRONMENT` separate from `RUNTIME_PROFILE`, use distinct
ignored config files and non-Production credentials per profile, and register sensitive fields for
redaction. Verification trusts exactly one Nginx proxy hop while the app port is internal; daily
Development trusts no forwarded proxy headers. Hosted trust remains pending real inspection.

**Rationale**: This enforces configuration completeness and environment identity without treating
Verification as Production or a fourth environment. Fastify supports scoped proxy trust and derives
forwarded host/protocol/client fields only when the configured proxy policy accepts the peer.

**Alternatives considered**:

- `trustProxy: true` everywhere: unnecessarily trusts spoofable forwarded headers.
- defaults for missing critical values: contradict fail-before-work requirements.
- Podman secrets or a separate secret platform: adds machinery for synthetic local credentials and
  does not authorize Production secrets locally.
- log raw validation/connection errors: risks protected value and infrastructure disclosure.

## Decision 7: Explicit migrations and no Product schema

**Decision**: Provide separate Kysely `status` and `apply` commands. Setup/Verification invoke
`apply` explicitly; application startup only checks database connectivity and that migration state
is current, then refuses readiness when migrations are pending. Create no Product/domain migration,
seed, or probe table. Kysely-owned bookkeeping and temporary test-only schema objects may prove the
migration mechanism.

**Rationale**: Kysely's Migrator/FileMigrationProvider supports ordered version-controlled
migrations, status inspection, and serialized execution. Explicit execution satisfies migration
readiness without contradicting the prohibition on startup auto-migration or inventing domain data.

**Alternatives considered**:

- auto-migrate whenever the application starts: hides operational failure and violates Frozen
  deployment rules.
- add a permanent `foundation_probe` table: meaningless canonical schema and future debt.
- skip database/migration integration: does not prove FR-009.

## Decision 8: HTTP-level, real-engine, and lifecycle verification only

**Decision**: Use Vitest for configuration/redaction and orchestration units, Fastify `inject()` for
liveness/readiness contracts, a real Podman MySQL-compatible database for integration/migration
checks, and HTTP-level Verification through Nginx for SSR HTML, Admin assets, server health,
forwarded headers, direct-port isolation, and per-contract results. Do not add Playwright or an
arbitrary coverage threshold in this Delivery.

**Rationale**: There is no Product journey, authentication flow, upload, or interactive behavior to
justify browser automation. HTTP/render/build checks are the lowest layer that proves the current
route, SSR, proxy, and readiness requirements. Lifecycle validation separately proves named-volume
persistence, exact reset, repeatability, and profile independence.

**Alternatives considered**:

- Playwright/cross-browser suites now: testing ceremony without a current user journey.
- unit tests with a mocked/SQLite database only: cannot prove real-engine or proxy behavior.
- E2E-only verification: slower and produces weaker diagnostics.
- global coverage percentage: explicitly rejected by the risk/invariant-driven baseline.

## Decision 9: Operational contracts, not a foundation Product API

**Decision**: Expose only `/health/live` and `/health/ready` as JSON operational endpoints. Prove
Public `/` and Admin `/admin/` reachability as HTML routes. Standardize root lifecycle commands,
configuration keys, exit codes, isolation rules, and Verification result names in feature contracts;
do not create `packages/contracts` or `/api/*` foundation endpoints.

**Rationale**: External operational interfaces need stable testable behavior, but FR-002/FR-016
prohibit turning the foundation into a feature API. Two health endpoints plus route/command
contracts are sufficient.

**Alternatives considered**:

- no contracts: leaves startup/readiness/reset/failure behavior ambiguous.
- Public/Admin foundation JSON APIs: unneeded Product-like surface.
- shared contracts package: no implemented cross-app transport reuse exists yet.

## Evidence consulted

- Approved `specs/001-application-foundation/spec.md`
- Delivery Context Plan routing: SRC-04 through SRC-09
- [Node.js official release schedule](https://nodejs.org/en/about/previous-releases) (Node.js 24 LTS)
- [npm official workspace documentation](https://docs.npmjs.com/cli/v11/using-npm/workspaces/)
- [MySQL official 8.4 LTS release model](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html)
- [Podman official `podman compose` documentation](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [Podman official volume-removal documentation](https://docs.podman.io/en/latest/markdown/podman-volume-rm.1.html)
- Context7 current upstream documentation for React Router, Fastify, and Kysely
- [React Router official adapter documentation](https://reactrouter.com/api/other-api/adapter) and
  [v7-to-v8 requirements](https://reactrouter.com/upgrading/v7)
- [Vite 8 official compatibility announcement](https://github.com/vitejs/vite/blob/v8.0.10/docs/blog/announcing-vite8.md)

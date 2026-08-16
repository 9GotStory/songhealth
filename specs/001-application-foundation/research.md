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
feature design. For current Kysely 0.29, import migration APIs from `kysely/migration` rather than
deprecated root exports.

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
immutable digest that resolves specifically to `mysql:8.4` and labeled provisional. Do not use the
floating `mysql:lts` or `latest` tag. Configure InnoDB and `utf8mb4`; do not freeze Production
vendor/version, collation, pool size, or compatibility claims.

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
`verification` project names, applies complete reverse-DNS ownership labels, explicitly sequences/
polls components, and maintains a mode-`0600` ignored atomic per-profile operation journal.

Development publishes its database only to loopback and preserves its named volume on routine
stop. Verification publishes only Nginx; its app/database remain network-internal. Verification
must begin from an absent clean inventory; stale resources require explicit recovery rather than
automatic pre-clean.

Before mutation, typed Podman inspection must prove exact resource type/name, checkout-scoped
project, manifest allowlist, canonical Compose labels, custom ownership labels, and expected
attachment/mount state. A read-only inventory binds those facts and the requested action into a
confirmation digest; after acquiring a per-profile lock, the command immediately re-inventories and
refuses any change. Destructive actions remove recorded exact resources individually without force.
No name-prefix, wildcard, label-filter, `--remove-orphans`, broad `down --volumes`, prune, or force
fallback is permitted.

The journal preserves action/phase, inventory and mutation-plan digests, primary failure, secondary
cleanup failure, and safe next action. Signals/interruption leave the profile stopped or not-ready;
cleanup is automatic only for exact current-run resources, and later destructive recovery requires
a fresh inventory-bound token.

**Rationale**: Two small manifests make data ownership and port exposure structurally distinct and
allow the profiles to coexist. Podman's `compose` command delegates to an external Compose provider,
so preflight must verify that provider and orchestration cannot rely solely on provider-dependent
health-condition behavior.

**Alternatives considered**:

- one manifest with profiles: fewer files, but easier accidental sharing of volumes, credentials,
  or published ports.
- fixed global project names: collide across checkouts.
- random project names: accumulate orphaned resources and obscure ownership.
- provider labels alone, name prefixes, `--remove-orphans`, or broad cleanup/prune commands: cannot
  prove exact ownership and are unsafe for recovery.
- containerize daily Node/Vite applications: no daily-development value justifies it.

## Decision 6: Fail-closed typed configuration and bounded proxy trust

**Decision**: Parse the full runtime configuration through a TypeBox-backed schema before opening
the database pool or listener. Keep `APP_ENVIRONMENT` separate from `RUNTIME_PROFILE`, use distinct
ignored config files and non-Production credentials per profile, and reject missing, empty,
malformed, unsupported, out-of-range, or cross-profile values with distinct stable reason codes.
The mapping is respectively `CONFIG_MISSING`, `CONFIG_EMPTY`, `CONFIG_MALFORMED`,
`CONFIG_UNSUPPORTED`, `CONFIG_OUT_OF_RANGE`, and `CONFIG_PROFILE_CONFLICT`.
Fixture provenance is allowlisted to `synthetic` or `approved-non-production`; Production-derived
data is invalid in this Delivery even if claimed sanitized. Verification trusts exactly one Nginx
proxy hop while the app port is internal; daily Development trusts no forwarded proxy headers.
Hosted trust remains pending real inspection.

This fixture rule is a deliberate Delivery-specific narrowing of the broader future Blueprint
allowance for sanitized/minimized Production-derived test data; it does not weaken or conflict with
that authority.

Every failure surface uses one closed `SafeDiagnostic`: allowlisted reason code, profile, component,
optional safe configuration-key name, and allowlisted remediation. Standard output/error,
application and surfaced container/proxy logs, HTTP errors/readiness, and Verification reports never
pass through raw exceptions or child-process output. Sentinel tests scan every surface for raw
values, credentials, URLs, stacks, internal exceptions, and unnecessary path/host/container/proxy
details.

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
is current, then refuses readiness when migrations are pending. One version-controlled operational
migration creates `foundation_persistence_marker`, the minimum non-Product table now required by
SC-002. Marker commands write/read one synthetic non-sensitive row; after an exact Development reset,
migrations recreate the empty table and the old row must be absent. No other Product/domain schema,
seed, or migration is created.

**Rationale**: Kysely's Migrator/FileMigrationProvider supports ordered version-controlled
migrations, status inspection, and serialized execution. Explicit execution satisfies migration
readiness; the approved clarification supersedes the former identity-only proof and justifies this
single operational marker without inventing domain data.

**Alternatives considered**:

- auto-migrate whenever the application starts: hides operational failure and violates Frozen
  deployment rules.
- use the MySQL instance UUID or volume identity alone: does not prove Delivery-owned stored data
  remained readable.
- create an ad-hoc unversioned marker table: conflicts with the version-controlled schema-change
  baseline.
- skip database/migration integration: does not prove FR-009.

## Decision 8: HTTP-level, real-engine, and lifecycle verification only

**Decision**: Use Vitest for configuration/diagnostic and orchestration units, Fastify `inject()` for
liveness/readiness contracts, a real Podman MySQL-compatible database for integration/migration and
marker checks, and HTTP-level Verification through Nginx for SSR HTML, Admin assets, server health,
forwarded headers, direct-port isolation, and per-contract results. Verification emits exactly these
ordered PASS/FAIL results: `build`, `startup`, `configuration-valid`,
`configuration-missing-rejected`, `configuration-empty-rejected`,
`configuration-malformed-rejected`, `configuration-unsupported-rejected`,
`configuration-out-of-range-rejected`, `configuration-cross-profile-rejected`, `migration`,
`database`, `liveness`, `readiness`, `isolation`, `proxy`, `public-route`, `admin-route`,
`server-route`, `cleanup`, and `reporting`. An earlier failure makes blocked later checks explicit
`PREREQUISITE_FAILED` failures. Cleanup/reporting never replace an earlier primary failure; if no
earlier result failed, the first cleanup or reporting failure is primary. The final report is emitted
atomically after cleanup and schema/nondisclosure validation. Do not add Playwright or an arbitrary
coverage threshold in this Delivery.

An acceptance-only fault-injection interface is limited to synthetic local profiles and allowlisted
phases for start, stop, migration, reset, and cleanup. It proves interruption journaling, next-run
detection, safe retry/refusal, fresh-token recovery, and primary-failure preservation without adding
a general-purpose fault/chaos platform.

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
define inventory-bound reset/recovery, operation-journal, timing, and safe diagnostic contracts; do
not create `packages/contracts` or `/api/*` foundation endpoints.

**Rationale**: External operational interfaces need stable testable behavior, but FR-002/FR-016
prohibit turning the foundation into a feature API. Two health endpoints plus route/command
contracts are sufficient.

**Alternatives considered**:

- no contracts: leaves startup/readiness/reset/failure behavior ambiguous.
- Public/Admin foundation JSON APIs: unneeded Product-like surface.
- shared contracts package: no implemented cross-app transport reuse exists yet.

## Decision 10: Foundation-scoped security evidence without a security platform

**Decision**: Add a Phase 1 security contract and require implementation to maintain
`docs/security/asvs-foundation-evidence.md` with versioned ASVS 5.0.0 requirement ID, level,
applicability/rationale, implementation, verification, and evidence. Applicable Level 1 controls
are the floor; selected Level 2 controls cover the current proxy, configuration, data-disclosure,
logging, and error risks. Authentication/session controls are explicitly not applicable because
FR-016 excludes them. No blanket ASVS compliance claim is permitted.

The discoverable security gate uses the one-shot image
`ghcr.io/gitleaks/gitleaks:v8.29.1@sha256:aa036a2f4bdfe3cc3c55fa4326308efabb4a6be498c883c864fd1d0d5585438a`
for committed-secret detection. Before scanning tracked content it runs an ephemeral synthetic
canary that must be detected, avoiding a silent scanner/configuration success. The gate also uses
npm's locked dependency graph for vulnerability review with explicit triage and a deterministic
matrix-completeness validator. A failed canary, committed secret, unreviewed actionable dependency
finding, or incomplete applicable ASVS row returns non-zero. This adds no daemon, SaaS, or secrets
platform. Gitleaks v8.30.1 was not selected because a confirmed upstream regression can make its
default-rule scans return false success; a later version requires reviewed repinning.

**Rationale**: FR-013 and the accepted Blueprint require evidence, not checklist theatre. Reusing
Podman and npm keeps the gate small while an explicit matrix prevents unsupported compliance claims
and documents why Product authentication/session controls are deferred.

**Alternatives considered**:

- generic scanner output without an applicability/evidence matrix: not traceable to the accepted
  ASVS profile.
- a custom secret scanner: weaker than a maintained single-purpose tool.
- a security platform/SAST service baseline: adds operational scope with no present requirement.
- require Product browser/security journeys: no Product journey, auth, upload, or state-changing API
  exists in this Delivery.

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
- [OWASP ASVS 5.0.0 tagged requirements](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0)
- [Gitleaks v8.29.1 immutable container manifest](https://github.com/gitleaks/gitleaks/pkgs/container/gitleaks)
- [Gitleaks v8.30.1 false-success regression](https://github.com/gitleaks/gitleaks/issues/2170)
- [Compose specification labels](https://compose-spec.github.io/compose-spec/spec.html)
- [Fastify reply lifecycle and `reply.hijack()`](https://github.com/fastify/fastify/blob/main/docs/Reference/Reply.md)
- [Kysely releases and migration import guidance](https://github.com/kysely-org/kysely/releases)

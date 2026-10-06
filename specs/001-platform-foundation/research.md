# Phase 0 Research: Platform Foundation

**Feature**: `001-platform-foundation`

**Research date**: 2026-10-06

**Source policy**: Current official project documentation, official package metadata, and
authoritative upstream repositories only. Historical Songhealth implementation was not consulted.

## 1. Application Runtime and Integration

**Decision**: Use one Astro SSR application with EmDash registered as an Astro integration, the
official Node adapter in standalone mode, React for the Admin, and the EmDash live-collection
loader. Serve the minimum public verification behavior at the normal `/` route.

**Rationale**: EmDash documents this as its supported Node/Astro shape; Admin and public rendering
share the same application rather than requiring a second backend. Astro standalone mode emits a
self-contained Node entry and does not require Express, Fastify, or another application server.
[EmDash existing-project guide](https://docs.emdashcms.com/existing-project/),
[EmDash architecture](https://docs.emdashcms.com/concepts/architecture/),
[Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)

**Alternatives considered**:

- A separate Songhealth API/backend: rejected; it duplicates the native EmDash runtime and violates
  current architecture.
- Astro middleware mode plus Express/Fastify: rejected; no host-framework requirement exists.
- Static or hybrid output: rejected; current authority fixes Astro SSR and live CMS integration.
- A public `/health` endpoint: rejected; the Product Owner explicitly separated public runtime
  behavior from operational readiness.

## 2. Version and Package Baseline

**Decision**: Plan against Node.js 24.21.0 LTS, npm 12.2.0, Astro 7.3.5,
`@astrojs/node` 11.1.6, EmDash 1.1.0, `@astrojs/react` 6.0.5, React/ReactDOM
19.2.4, TypeScript 6.0.3, and `pg` 8.23.1. Re-check this set immediately before
implementation, then pin exact versions and commit one `package-lock.json`.

**Rationale**: Official metadata on 2026-10-06 reports EmDash 1.1.0 with Node `>=22.16`, Astro
`>=6`, React `>=18`, and optional `pg ^8`; its upstream catalog tests Astro 7, the React 6 adapter,
and React 19. Astro 7.3.5 and the Node adapter 11.1.6 are a compatible current pair. Node 24 is
Active LTS, while Node 26 is Current. npm lockfiles plus `npm ci` provide a reproducible consumer
install. [EmDash package](https://www.npmjs.com/package/emdash),
[EmDash upstream catalog](https://raw.githubusercontent.com/emdash-cms/emdash/main/pnpm-workspace.yaml),
[Astro package metadata](https://github.com/withastro/astro/blob/latest/packages/astro/package.json),
[Node releases](https://nodejs.org/en/about/previous-releases),
[Node 24.21.0](https://nodejs.org/en/blog/release/v24.21.0),
[npm lockfiles](https://docs.npmjs.com/files/package-lock.json/),
[npm ci](https://docs.npmjs.com/cli/commands/npm-ci/)

**Alternatives considered**:

- Node 22 Maintenance LTS: compatible fallback, but a shorter support runway.
- Node 26 Current: rejected for the production baseline because Node recommends LTS releases for
  production.
- pnpm/Yarn/Bun: supported choices, but adding a second toolchain has no demonstrated benefit for
  this single consumer application.
- Version ranges or `latest` tags as deployment contracts: rejected; `current/10` requires pinning.

## 3. Bootstrap Without Product Content Scope

**Decision**: Bootstrap the root-level application on the documented EmDash/Astro path and commit
an explicit `seed/seed.json` with seed version `1` and no collections/content or other Product
model objects.

**Rationale**: When a project has no seed, EmDash applies a built-in Posts/Pages model with
Category/Tag. Feature 001 explicitly excludes the Songhealth content model, and the native seed
format permits all those sections to be empty or omitted. The empty seed is configuration, not a
custom schema framework. [EmDash seed files](https://docs.emdashcms.com/themes/seed-files/),
[EmDash existing-project guide](https://docs.emdashcms.com/existing-project/)

**Alternatives considered**:

- Accepting the default seed: rejected because it would deliver unapproved content collections.
- Designing preliminary Songhealth collections: rejected as Feature 001 scope expansion.
- A custom initialization service: rejected; the native seed and setup process are sufficient.

## 4. PostgreSQL and Native Migrations

**Decision**: Use EmDash's native PostgreSQL adapter with a runtime `DATABASE_URL`, PostgreSQL
18.6, and `pg` 8.23.1. Use native EmDash migration commands and a stable, non-superuser application
role with the documented schema/object ownership permissions.

**Rationale**: EmDash officially supports PostgreSQL on Node and documents connection,
least-privilege role, and core migration behavior. No explicit PostgreSQL server-major support
range is published; PostgreSQL 18.6 is the current supported upstream release and is therefore the
selected baseline, subject to an early native migration/start smoke test before further
implementation proceeds. [EmDash database options](https://docs.emdashcms.com/deployment/database/),
[EmDash core migrations](https://docs.emdashcms.com/deployment/core-migrations/),
[PostgreSQL 18.6](https://www.postgresql.org/docs/release/18.6/)

**Alternatives considered**:

- SQLite, D1, or libSQL: rejected because current architecture fixes PostgreSQL.
- A custom repository/ORM/migration layer: rejected; EmDash owns its active schema and migrations.
- Superuser application access: rejected; EmDash documents narrower required permissions.

**Resolved limitation**: EmDash does not publish a server-major matrix. The plan does not invent
one; it selects the current PostgreSQL stable release and makes direct compatibility verification a
fail-fast implementation gate.

## 5. Media Storage

**Decision**: Use EmDash's native local-filesystem storage adapter against a dedicated persistent
media volume in production and an ignored local directory in development.

**Rationale**: EmDash explicitly recommends local storage for a single Node server with writable
persistent disk. This satisfies the fixed single-host baseline without adding object storage,
credentials, or a custom media system. EmDash also states that database backups contain media
metadata but not the files. [EmDash storage options](https://docs.emdashcms.com/deployment/storage/),
[EmDash Media Library](https://docs.emdashcms.com/guides/media-library/)

**Alternatives considered**:

- S3/R2/MinIO: valid native adapters but rejected for Feature 001 because no object-storage or
  multi-instance requirement exists.
- A custom media adapter/subsystem: rejected; there is no capability gap.
- Container-layer storage: rejected because it fails recreation durability.

## 6. Authentication and Admin Availability

**Decision**: Use native EmDash first-user setup, passkey authentication, sessions, roles, and
Admin. Feature 001 verifies Admin availability but does not configure external identity providers.

**Rationale**: Passkeys are EmDash's default; the first Admin is created through the setup wizard,
and native server-side permissions protect Admin routes. A production passkey is bound to the
production HTTPS domain, so the external proxy/HTTPS boundary must be present for production UAT,
but no particular proxy product is needed. [EmDash authentication](https://docs.emdashcms.com/guides/authentication/),
[EmDash Admin panel](https://docs.emdashcms.com/concepts/admin-panel/)

**Alternatives considered**:

- Custom auth/RBAC or Module Scope: rejected by authority and unnecessary.
- OAuth/email provider setup: deferred; Feature 001 has no accepted provider requirement.
- Automated passkey login as a recurring health check: rejected as brittle and unnecessary.

## 7. Operational Readiness

**Decision**: Keep the public `/` verification page separate from one minimal server-side readiness
helper. A normal probe combines a loopback SSR request, bounded PostgreSQL check, and non-mutating
expected-media-mount presence/readability check. Native `emdash migrate --check` and one bounded
media write/read/delete check run during deployment/startup and integration verification. Quadlet
health and `Notify=healthy` expose ready/not-ready through user systemd, not the public web surface.

**Rationale**: EmDash's documented sample health route checks only that Astro can serve a route and
explicitly does not cover database, storage, or migrations. No supported all-dependency EmDash or
Astro readiness primitive was found. Podman Quadlet natively supports health commands and delaying
systemd readiness until the health check passes. [EmDash Node deployment](https://docs.emdashcms.com/deployment/nodejs/),
[EmDash CLI](https://docs.emdashcms.com/reference/cli/),
[Podman Quadlet](https://docs.podman.io/en/stable/markdown/podman-systemd.unit.5.html)

**Alternatives considered**:

- Treat process startup or `/` alone as ready: rejected; it cannot detect failed persistence.
- Expose a public aggregate endpoint: rejected; Product authority says it is not required.
- Build a readiness API, plugin, service layer, monitoring/observability framework, or public
  endpoint: rejected; a narrow server-side helper using existing dependencies is sufficient.
- Write to persistent media during every normal readiness probe: rejected; deployment/startup and
  integration checks provide writeability evidence without repeated mutation.

**Demonstrated gap**: There is no native aggregate readiness primitive covering Astro response,
PostgreSQL, migration state, and local media. The planned private helper is the only custom
foundation extension and requires focused tests for correct ready/not-ready and secret-redaction
behavior.

## 8. Production Podman and Quadlet Topology

**Decision**: Use rootless Podman user Quadlets: one `.network`, two `.volume`, and two `.container`
units. Publish only the application on the proxy-facing loopback boundary; attach both containers
to the private network and publish no PostgreSQL port. Pin images by version and digest.

**Rationale**: Quadlet natively generates systemd units for containers, networks, and volumes,
supports dependencies, health, secrets, and rootless user paths, and leaves normal systemd restart
and enablement semantics available. Current upstream Podman is 6.1.3; production should use a
vendor-supported package with the verified features and record its exact version. [Quadlet unit
reference](https://docs.podman.io/en/stable/markdown/podman-systemd.unit.5.html),
[Podman 6.1.3 release](https://github.com/containers/podman/releases/tag/v6.1.3),
[Podman downloads policy](https://github.com/containers/podman/blob/main/DOWNLOADS.md)

**Alternatives considered**:

- Docker Compose: rejected as a parallel production baseline.
- Kubernetes: rejected as outside Version 1.
- A distributed/microservice topology: rejected; one coherent application is sufficient.
- Publishing PostgreSQL with host firewall assumptions: rejected; omitting the port is simpler and
  safer.

## 9. Backup and Restore

**Decision**: Create an unfiltered PostgreSQL custom-format logical archive with `pg_dump`, restore
it into a clean PostgreSQL database with `pg_restore --exit-on-error`, archive media separately,
and associate both artifacts with the same known validation state through one manifest and
recovery-set identifier.

**Rationale**: EmDash documents that its database contains content models, entries, users, settings,
and plugin data while media binaries live in a separate storage backend. PostgreSQL documents that a
full `pg_dump` export captures a consistent single-database state and that custom archives can be
used by `pg_restore` to reconstruct that database. No evidence showed that Feature 001's EmDash
state requires cluster-level physical recovery. The Product Owner therefore selected the smaller
logical path for this bounded feature. The validation state is quiescent while the database and
media artifacts are created sequentially, so no atomic cross-store protocol is implied.
PostgreSQL cluster-global roles are not EmDash database content; the stable application role and
clean target database are recreated from external deployment configuration before restore.
[EmDash database options](https://docs.emdashcms.com/deployment/database/),
[PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html),
[PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html),
[EmDash backups](https://docs.emdashcms.com/guides/backups/)

**Alternatives considered**:

- EmDash JSON export as the database recovery artifact: rejected; it does not reconstruct the
  complete PostgreSQL-backed EmDash state and does not cover media bytes.
- `pg_basebackup`/physical cluster recovery: rejected for Feature 001 because it introduces
  replication privileges and cluster/WAL concerns without an accepted requirement.
- Continuous WAL archiving, PITR, standby servers, replication, retention automation, or an
  RTO/RPO: explicitly deferred until a later operational requirement demonstrates the need.
- Atomic database/media snapshots: rejected; not required for the quiescent validation state.

No custom recovery extension is needed. The plan uses supported PostgreSQL and standard archive/
checksum commands directly and validates the complete restored EmDash state.

## 10. Runtime Secret Recoverability

**Decision**: Treat required operator-provided runtime secrets, including
`EMDASH_ENCRYPTION_KEY`, as a separate protected recovery dependency. Document and verify an
external backup/recovery procedure without storing secret values in Git, database/media artifacts,
planning documents, or evidence logs. Do not select or build a secret-management platform.

**Rationale**: EmDash documents that `EMDASH_ENCRYPTION_KEY` exists only in the runtime environment,
is absent from database backups, and must be kept in a secret manager plus a separate recovery
backup. Losing a referenced key leaves encrypted plugin settings unreadable. Reviewable evidence can
record the secret name, version/recovery reference, and pass/fail restoration result without
disclosing its value. [EmDash secrets and key management](https://docs.emdashcms.com/deployment/secrets/)

**Alternatives considered**:

- Store secrets in Git, the OCI image, or planning artifacts: rejected as a direct security
  violation.
- Put secret values into the database/media recovery manifest: rejected; the manifest is reviewable
  evidence, not protected secret storage.
- Build a vault or secret-management service: rejected; an operator-managed protected mechanism is
  sufficient for Feature 001.
- Ignore secrets during recovery because no plugin secret is seeded: rejected; foundation recovery
  must preserve the runtime boundary needed by later bounded features.

## 11. Testing Approach

**Decision**: Use Astro's checker, Node's built-in test runner, Playwright for only the two browser
surfaces, and shell-driven operational scenarios. Collect evidence from the same commands that an
independent maintainer/operator uses.

**Rationale**: This covers Songhealth-owned configuration, readiness aggregation, secret redaction,
native Admin/public integration, and real Podman boundaries without reproducing upstream test
suites. [Astro testing guidance](https://docs.astro.build/en/guides/testing/),
[Playwright documentation](https://playwright.dev/docs/intro)

**Alternatives considered**:

- A broad unit-test framework plus mocked EmDash internals: rejected as duplication.
- Browser automation for every operational check: rejected; network/volume/systemd facts are better
  verified at their native boundary.
- Manual-only acceptance: rejected; repeatable evidence is required.

## 12. Interface Contracts

**Decision**: Do not create `contracts/` for Feature 001.

**Rationale**: The feature introduces no custom external API, library protocol, webhook, or CLI
contract. `/` is a minimal application verification page; `/_emdash/*` and media routes are native
upstream behavior; operational commands are validation procedures documented in `quickstart.md`.

**Alternatives considered**:

- Inventing an OpenAPI document for readiness: rejected because no public readiness endpoint exists.
- Treating native EmDash routes as Songhealth-owned contracts: rejected; Songhealth does not own or
  reimplement those interfaces.

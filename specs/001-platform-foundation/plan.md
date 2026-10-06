# Implementation Plan: Platform Foundation

**Branch**: `001-platform-foundation` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-platform-foundation/spec.md`

## Summary

Establish one server-rendered Astro application with EmDash integrated as its CMS/Admin, backed by
PostgreSQL and EmDash's native local-media adapter. Development uses native Node.js/npm tooling and
a rootless Podman PostgreSQL container; production packages the single application as an OCI image
and operates it with PostgreSQL through rootless Podman and systemd Quadlet. Database and media
storage are mounted outside ephemeral container layers, configuration and secrets are injected at
runtime, and a private operator check reports readiness without adding a public health endpoint.

The foundation deliberately contains no Songhealth Product content collections. An explicit empty
EmDash seed prevents the platform's built-in example Posts/Pages model from silently expanding the
feature. The minimum public surface is one normal SSR verification page; the native EmDash Admin is
available at its standard route. Recovery uses a complete PostgreSQL logical archive restored into
a clean database, a separate media archive, an association/integrity manifest, and an independently
protected runtime-secret recovery procedure. No application code, deployment configuration, or
tasks are created in this Plan phase.

## Technical Context

**Language/Version**: TypeScript 6.0.3 on Node.js 24.21.0 LTS; npm 12.2.0 with one committed
`package-lock.json`

**Primary Dependencies**: Astro 7.3.5, `@astrojs/node` 11.1.6 in standalone mode, EmDash 1.1.0,
`@astrojs/react` 6.0.5, React/ReactDOM 19.2.4, and `pg` 8.23.1. These are the researched
2026-10-06 compatibility baseline; implementation MUST re-check the set and pin exact resolved
versions in the manifest and lockfile rather than use an unbounded `latest` contract.

**Storage**: PostgreSQL 18.6 on a persistent Podman volume; EmDash's native local-filesystem media
adapter on a separate persistent Podman volume. Development uses the same PostgreSQL major and an
ignored local media directory.

**Testing**: `astro check`, Node's built-in test runner for configuration/readiness logic,
Playwright 1.63.0 for focused public/Admin browser smoke checks, and command-driven Podman/Quadlet,
network, persistence, logical backup/restore, secret recovery, and media recovery verification.
Tests cover Songhealth configuration and boundaries, not Astro or EmDash internals.

**Target Platform**: Linux production host with rootless Podman and user systemd/Quadlet. Podman
6.1.3 is the current upstream reference release; the production host MUST use a supported package
whose Quadlet implementation provides the researched `.container`, `.network`, `.volume`, health,
and secret behavior. The exact host version is recorded in verification evidence.

**Project Type**: Single server-rendered web application; no separate frontend/backend projects or
monorepo packages.

**Performance Goals**: No Product SLA or throughput target is authorized for Feature 001. The
foundation must return the minimum SSR verification page, load the native Admin surface, and
complete every defined readiness check with the expected result.

**Constraints**: One Astro + EmDash application container; no public readiness endpoint; no public
PostgreSQL port; external configuration and secrets; persistent database/media mounts; rootless
Podman + Quadlet production lifecycle; no Docker Compose/Kubernetes baseline; no custom Product
content model; no physical backup, PITR, WAL archiving, replication, new RTO/RPO, or atomic
cross-store backup protocol in Feature 001.

**Scale/Scope**: One production application container, one PostgreSQL container, one private
application network, and two persistent storage boundaries on the Version 1 single-host baseline.
The design does not claim horizontal scaling or implement later Product features.

## Constitution Check

*GATE: Must pass before Phase 0 research and again after Phase 1 design.*

| Principle / boundary | Pre-research result | Post-design result | Evidence |
|---|---|---|---|
| Current Authority and Clean Rebuild | PASS | PASS | Only the Constitution, active Feature 001 specification, `current/00-10`, and current official upstream sources informed the plan. No historical implementation or Git history was used. |
| Platform-Native First, Minimal Extension | PASS | PASS | Astro standalone SSR, EmDash PostgreSQL/migrations/Admin/auth/media, PostgreSQL logical backup tools, standard media archiving, and Quadlet lifecycle are native. The only custom runtime helper aggregates readiness because EmDash supplies no native aggregate signal. |
| Simple, Structured, Sustainable | PASS | PASS | One application, one package manager/lockfile, one database, local persistent media, and a small application-oriented layout; no monorepo, service/repository layers, or speculative infrastructure. |
| Security and Data Protection | PASS | PASS | Secrets remain external and separately recoverable, the DB role is least-privilege and non-superuser, PostgreSQL has no host-published port, and validation content is non-confidential/public-publishable. |
| Spec-Driven Delivery and Human Authorization | PASS | PASS | This output stops at Plan artifacts. No tasks, dependencies, implementation, schema, image, or deployment files are created. |
| Independent Implementation Review | PASS | PASS | Verification produces reviewable evidence; Codex review remains required after bounded Claude Code implementation. Parallel implementation is permitted only for dependency-safe, non-overlapping files/resources. |
| Production Operations and Durability | PASS | PASS | Rootless Podman + Quadlet, private app/DB network, persistent DB/media volumes, lifecycle checks, complete logical database restore, media restore, and separate secret recovery satisfy the Version 1 baseline in `current/10`. Production-grade physical backup/PITR remains deferred. |

The Constitution Check was rerun after the Product Owner recovery, secret, and readiness decisions
were incorporated and after the owning Backup and Recovery authority in `current/10` was amended.
It remains PASS with no exception or complexity waiver. The complete logical recovery choice is the
smallest Feature 001 implementation of the current Version 1 baseline. Physical backup, WAL
archiving, PITR, or replication-class recovery remains a later authority decision triggered only by
an accepted RPO/RTO, scale, operational-risk, or other current requirement.

## Architecture and Implementation Approach

### One Astro + EmDash platform

- Bootstrap one root-level Astro project using the current EmDash-supported Node path. Configure
  Astro for `output: "server"` with the official Node adapter in standalone mode and register React,
  EmDash, the native PostgreSQL adapter, native local-media storage, and the `_emdash` live
  collection loader.
- Use `src/pages/index.astro` only as the minimum SSR verification surface. Its stable response
  marker proves normal public runtime behavior; it is not a health API and does not add Product
  homepage composition.
- Keep the native EmDash Admin route and first-admin setup/passkey flow. Do not add authentication
  glue, custom roles, or another CMS/API surface.
- Commit `seed/seed.json` as a valid, explicit EmDash version-1 seed with no Product collections,
  content, taxonomies, relations, redirects, menus, or widgets. This suppresses EmDash's default
  example model while leaving later approved features to add the real Content Model.
- Use native EmDash migrations. The exact application build/sync emits the migration manifest used
  by production deployment. The supported startup procedure inspects that target with
  `emdash migrate --status`, applies pending migrations with `emdash migrate` while preserving the
  native target-fingerprint safety check for non-interactive execution, and then verifies the
  resulting state with `emdash migrate --check`. Apply or check failure blocks readiness. Native
  runtime `check` mode may enforce production state and native `auto` mode may be used in
  development; no custom migration framework or mirrored schema layer is introduced.

### Configuration and secrets

- Commit only a documented `.env.example` containing variable names and non-secret examples.
  Required runtime inputs include the public site origin, server host/port, PostgreSQL connection,
  media directory, and EmDash encryption key. Validation fails closed on missing or malformed
  required values and redacts their values from output.
- Keep `DATABASE_URL`, `EMDASH_ENCRYPTION_KEY`, database passwords, and backup credentials in
  operator-managed Podman/systemd secrets or equivalent host-protected files. Non-secret values may
  use an external environment file. Neither class is baked into the OCI image or committed.
- Maintain an independently protected backup/recovery procedure for required operator-provided
  runtime secrets, including `EMDASH_ENCRYPTION_KEY`. The procedure records only secret names,
  version/recovery references, and pass/fail evidence in reviewable artifacts; actual values remain
  outside Git, database/media backups, logs, and planning artifacts. Feature 001 does not select or
  build a secret-management platform.
- Use one stable, non-superuser EmDash PostgreSQL role with the native permissions EmDash documents:
  database connect, schema usage/create, DML, and ownership/inherited ownership of EmDash objects.
  Logical backup access follows normal PostgreSQL read/backup permissions; Feature 001 introduces no
  replication role or privilege.
- Pin the Node build/runtime base image, PostgreSQL 18.6 image, and built application image by
  explicit version and immutable digest in implementation/deployment definitions.

### Development path

- Run Node.js, npm, Astro, EmDash, Spec Kit, and agent tooling natively. Use `npm ci` from the
  committed lockfile.
- Start only PostgreSQL in a disposable rootless Podman development container, with a named volume
  when persistence testing is needed. This is parity support, not a second production stack.
- Store development media in an ignored local directory through the same native EmDash local
  adapter. A clean-checkout guide names every prerequisite and command; an independent maintainer
  must need zero undocumented intervention.

### Production topology and durability

```text
Internet
  -> external HTTPS/reverse-proxy boundary (product not selected here)
  -> loopback/proxy-facing Astro + EmDash application port
  -> private rootless Podman application network
  -> PostgreSQL (no published host port)

Persistent volumes
  -> PostgreSQL data
  -> EmDash local media
```

- Provide one application `.container`, one PostgreSQL `.container`, one private `.network`, and
  separate database/media `.volume` Quadlet definitions. User-systemd owns start, stop, restart,
  ordering, restart policy, and enablement.
- Publish only the application port to the proxy-facing host boundary. Do not publish PostgreSQL.
  Verify isolation from an unintended host/public path and successful application-to-database
  access on the private network.
- Mount both data volumes explicitly. Container replacement removes/recreates only ephemeral
  containers; it never deletes/recreates the volumes. A missing expected attachment or an
  accidentally empty replacement store must produce not-ready, not automatic healthy
  initialization.
- Build one OCI application image. Upstream Docker examples inform OCI construction only; Docker
  Compose is not created or maintained as another production baseline.

### Runtime verification and readiness

- Keep public-runtime verification as a normal request to `/` with the expected SSR marker. It is
  separate from the private operational readiness mechanism.
- Implement one smallest-possible server-side `scripts/verify-readiness.mjs` helper because neither
  Astro nor EmDash provides a supported aggregate ready/not-ready signal for the required runtime,
  PostgreSQL, and media dependencies. The helper is repeatable and callable on demand. Every normal
  recurring probe is non-mutating: it performs a loopback request to `/`, a bounded PostgreSQL
  connectivity check, and a check that the expected media mount exists and is readable. It returns
  only redacted ready/not-ready evidence and is never exposed as a required public endpoint.
- Make the native migration sequence a deployment/startup gate before the application is declared
  ready: consume the migration manifest emitted by the exact application build, inspect the
  intended database target with `emdash migrate --status`, apply pending migrations with
  `emdash migrate`, and verify the resulting state with `emdash migrate --check`. The apply step
  preserves EmDash's target-fingerprint safety mechanism when run non-interactively. `--check`
  remains verification-only and does not apply migrations. Any status/apply/check failure or
  unknown migration state blocks readiness; no custom migration framework or separate migration
  service is introduced. Use the PostgreSQL image's `pg_isready` for database-container health.
  Quadlet health configuration and `Notify=healthy` make the resulting ready/not-ready state
  observable to operators.
- Prove media writeability during deployment/startup acceptance and integration verification with
  a bounded create/read/remove scratch-file probe or the smallest equally reliable mechanism.
  Failure blocks acceptance of the environment as ready for use. Do not perform a persistent media
  write on any normal recurring readiness probe.
- Verify the native Admin route separately. A setup redirect or authenticated Admin response is an
  expected availability result; routine health checks do not automate passkey login.
- Exercise normal, missing-configuration, database-unavailable, missing/unwritable-media, and
  recovery states. Logs and command output identify the failed dependency but never print secrets.
- The helper is not a health API subsystem, monitoring/observability framework, service layer,
  plugin framework, or public endpoint. It contains no Product logic and exposes no reusable
  operational API.

### Backup, restore, and secret recovery

- After establishing a quiescent known validation state, create one unfiltered PostgreSQL
  custom-format archive with `pg_dump`. Do not select individual schemas or tables: the artifact must
  contain the complete EmDash database schema and data required by Feature 001. Record tool/server
  versions and a checksum, and inspect the archive table of contents before accepting it.
- Archive the persistent media volume separately and checksum every designated validation file.
  The Recovery Set consists of the database archive, media archive, and common identifier/evidence
  associating both with the same known validation state. Sequential creation is acceptable and
  does not imply atomic cross-store backup.
- Treat Runtime Secret Recovery as a separate recovery dependency, not as a Recovery Set artifact.
  Confirm the independently protected secret backup is available before the recovery drill. Restore
  required secrets, including the same `EMDASH_ENCRYPTION_KEY`, through the external runtime secret
  mechanism and produce only non-secret pass/fail evidence. Do not create a secret-management
  platform or place values in Git, backup artifacts, planning artifacts, transcripts, or logs.
- Create a clean PostgreSQL 18 database owned by the stable EmDash role, restore the complete archive
  with `pg_restore --exit-on-error` and no object filtering, restore media into a clean media volume,
  inject the recovered runtime secrets, and recreate the application runtime. Run the same native
  status/apply/check migration sequence from the exact application build before readiness, then
  verify Admin/runtime operation, the canonical native EmDash site-tagline validation value, and
  every media checksum. Partial, corrupt, mismatched, or unusable inputs must fail closed.
- Use documented PostgreSQL and standard archive/checksum commands directly; do not add a backup
  framework, replication privilege, standby, WAL archiving, PITR, or continuous backup orchestration.
  Production-grade PITR/physical-backup architecture is explicitly deferred until a later accepted
  operational requirement demonstrates that it is needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-foundation/
├── spec.md
├── checklists/
│   └── requirements.md
├── plan.md
├── research.md
├── data-model.md
└── quickstart.md
```

No `contracts/` artifact is created: Feature 001 adds no Songhealth external API, library, or CLI
contract. The normal SSR page and native EmDash routes are application behavior, while operator
commands are documented verification procedures. `tasks.md` remains for the later Tasks phase.

### Planned Source Code (repository root)

```text
package.json
package-lock.json
astro.config.mjs
tsconfig.json
.env.example
seed/
└── seed.json                 # explicit empty native EmDash seed
src/
├── live.config.ts            # native EmDash live collection registration
└── pages/
    └── index.astro           # minimum public SSR verification surface
scripts/
└── verify-readiness.mjs      # narrow server-side aggregate signal; no public endpoint
tests/
├── node/
│   └── foundation.test.ts    # config/redaction/readiness helper behavior
├── browser/
│   └── foundation.spec.ts    # public SSR and native Admin smoke checks
└── operations/
    └── verify-foundation.sh  # lifecycle, isolation, durability, and recovery scenarios
deploy/
├── Containerfile
└── quadlet/
    ├── songhealth.network
    ├── songhealth-db-data.volume
    ├── songhealth-media.volume
    ├── songhealth-db.container
    └── songhealth-app.container
```

**Structure Decision**: Use one root-level application because Astro and EmDash are one runtime.
Directories correspond only to native application configuration, focused verification, and the one
approved production deployment baseline. No `backend/`, `packages/`, service/repository layer,
generic plugin framework, or speculative shared library is planned.

## Verification and Independent Review

Implementation evidence must include:

1. a clean-checkout setup completed by a maintainer who did not author it, with zero undocumented
   intervention;
2. production build/start and minimum SSR/Admin verification;
3. expected ready/not-ready results for every defined dependency/configuration state, with secret
   redaction;
4. three consecutive start/stop/restart/recreate cycles retaining the exact native EmDash site
   `tagline` validation value/digest and all designated media validation state;
5. rejection of all defined unintended public PostgreSQL connection attempts while private
   application access succeeds;
6. a complete logical database archive and separate media artifact associated with the same known
   state, restored into clean persistence with the exact native site `tagline` value/digest and
   100% of designated media files present with zero unexplained integrity differences;
7. independently protected required runtime secrets recovered through the external secret boundary
   without their values entering Git, planning artifacts, or evidence logs; and
8. rootless Podman/Quadlet unit, health, network, volume, and lifecycle evidence, including exact
   runtime/image versions and digests.

Codex independently reviews this evidence and the bounded implementation against the specification,
plan, tasks, Constitution, and `current/10`. An implementation agent's success report alone does not
complete the feature.

## Deferred Work

All Product content collections and public routes beyond the verification page; editorial content;
publishing behavior beyond native startup; custom RBAC/workflows; search; migrations/importers;
redirects; dashboards; monitoring-stack selection; reverse-proxy product selection; S3/object
storage; production-grade physical backup/PITR, WAL archiving, replication, continuous backup
operations; multi-host/horizontal scaling; and every other explicit
out-of-scope item remain later, separately authorized features or operational decisions.

## Complexity Tracking

No Constitution Check violations require justification.

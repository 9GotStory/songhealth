# Development runtime — prospective UID-1000 Quadlet architecture (Phase 1, source-only)

**Status (2026-10-26, PO gate 6410811185): SOURCE IMPLEMENTATION ONLY.** Nothing described
here is installed, started, migrated, backed up or verified. Activation requires the separate
Phase 2 provisioning Human Gate. This architecture is distinct from (a) the accepted
**production** Quadlet deployment (`deploy/quadlet/`, `docs/operations/production-foundation.md`)
and (b) the existing UID-1001 Compose/Controller runtime at `127.0.0.1:4322`, which remains
untouched until explicit owner-authorized retirement.

## Why
The UID-1000 workspace cannot operate the UID-1001 controller (0700 boundary, by design).
The PO approved preparing a development runtime the local workspace **owns end-to-end**,
using the accepted production Quadlet pattern (rootless Podman + systemd user units) with
development-appropriate simplifications — to reduce ownership friction for future T033–T035
work. This changes no Feature 002 standing: T022 stays TERMINAL/NOT PASSED; T032/SC-007
DEFERRED; T033–T035 BLOCKED; edge exceptions remain PROPOSED only.

## Topology (all names disjoint from production and from any UID-1001 resource)
| Resource | Name | Notes |
| --- | --- | --- |
| systemd units | `songhealth-dev-app.service`, `songhealth-dev-db.service` | user manager, UID 1000 |
| Containers | `songhealth-qdev-app`, `songhealth-qdev-db` | explicit ContainerName |
| Network | `songhealth-qdev` | private; DB has **no host port** |
| Volumes | `songhealth-qdev-db-data`, `songhealth-qdev-media` | PG18 mount `/var/lib/postgresql`; media requires operator marker `.songhealth-qdev-media-store` (fail-closed vs silent replacement) |
| App publication | `127.0.0.1:4324` → in-container 4321 | never 4322/4323; no fallback |
| Secrets | `songhealth-qdev-{db-password,migration-database-url,encryption-key}` | podman secrets; env files 0600 under `~/.config/containers/systemd/` |
| Source | bind `~/dev/songhealth-quadlet` → `/src:Z` | versioned checkout; exact SHA is the runtime source identity; app refuses to start without installed pinned deps |

## Images and pins
- PostgreSQL: `docker.io/library/postgres:18.6@sha256:fc973eb…` — **digest proven** (identical
  to the accepted production pin).
- Node: `docker.io/library/node:24.21.0` — the REPOSITORY unit keeps the version tag, but the
  Phase 2 installer resolves the immutable digest BEFORE any start, REWRITES the deployed copy
  under `~/.config/containers/systemd/` to `Image=docker.io/library/node@sha256:<digest>`, uses
  that same digest reference for the migration runner, and fails closed if resolution or the
  rewrite verification fails. Production image definitions are unchanged. npm 12.2.0/Node 24.21.0
  toolchain, Astro 7.3.5, EmDash 1.1.0 come from the checkout's lockfile (pinned dependencies
  installed into the source checkout with the pinned Node, not baked into an image).
- SELinux Enforcing: the source bind mount uses `:Z`; named volumes are labeled by Podman;
  no boolean changes are required by this design (to be confirmed at Phase 2 activation).

## Fresh-install initialization (Phase 2, native only)
`scripts/dev-runtime-install.sh` requires `SONGHEALTH_QDEV_SOURCE_SHA` (the exact
PO-authorized 40-hex SHA; fail-closed, no default), refuses dirty trees and git inspection
errors, and records the identity marker the app unit enforces at every start. It provisions
a **fresh empty** development database — never a
transfer of UID-1001 assets/credentials — then: least-privilege app role (`songhealth_qdev_app`,
NOSUPERUSER/NOCREATEDB/NOCREATEROLE), native EmDash migrations through the pinned in-container
CLI (`emdash migrate --from-config`), then app start. Authentication stays native passkey;
`setup/dev-bypass` is an initial-setup action evaluated at Phase 2, not presumed. Test role
fixtures, PATs and the T021 dev-only SSR route are **future separately reviewed permissions**;
existing browser tests cannot run here merely by setting `PLAYWRIGHT_BASE_URL` (the T021
coordinator assumes the persistent controller/4322 — adaptation is a separate reviewed change).

## Coexistence and the old runtime
The UID-1001 runtime (4322), its controller, DB, media and PATs are never accessed, stopped or
modified by anything here. Physical coexistence is possible only under the Phase 2 gate with
proven port/resource non-interference. There is no automatic stop/disable of the old system.

## Known host-context notes
- `shellcheck` is not installed on the authoring host: scripts passed `bash -n` and manual
  review only; running `shellcheck` at Phase 2 is recommended.
- The authoring account's user systemd config contains unrelated third-party quadlets
  (`supplies-dev-*`): names do not collide with `songhealth-qdev*`/`songhealth-dev-*`, but the
  Phase 2 port/ownership preflight must re-verify this live before activation.

## Verify / backup / restore
- `scripts/dev-runtime-verify.sh` — read-only checks; exit non-zero on any FAIL.
- `scripts/dev-runtime-backup.sh <dir>` — logical `pg_dump -Fc` + media tar + sha256; recovery
  additionally requires the external 0600 env files and podman secrets.
- Backup writes FOUR files per run: `qdev-db-<ts>.dump`, `qdev-media-<ts>.tar`, a PURE
  `qdev-checksums-<ts>.sha256` manifest (exactly `sha256sum --check --strict` grammar; no
  metadata lines), and `qdev-meta-<ts>.txt` (dump-name/media-name/source-sha/created-utc).
- `scripts/dev-runtime-restore.sh --confirm <dump> <tar> <checksums> <meta>` — guarded
  replacement of qdev DB/media only; refuses with the app running; requires typed
  confirmations; never prunes other resources. Archive admission (all BEFORE any destructive
  step): the manifest passes `sha256sum --check --strict`; the metadata supplies the 40-hex
  source-sha provenance — which must EXACTLY equal the installer-provisioned approved runtime
  source identity (`~/dev/songhealth-quadlet/.songhealth-qdev-source-identity`; missing or
  malformed record is fail-closed, never format-only) — and the EXACT dump/media basenames;
  the supplied files must equal those
  recorded names (swapped/reordered/wrong archives are refused) and must hash to their own
  manifest entries (computed on absolute, caller-cwd-independent paths); tar admission is an
  embedded `python3` strict POSIX-ustar 512-byte header WALKER (no tar output parsing):
  backups are written `--format=ustar`, and the walker accepts regular files/directories
  ONLY — hardlinks, symlinks, devices, FIFOs, PAX `x`/`g` and GNU `L`/`K` extension headers,
  non-ustar magics, bad header checksums (bytes [148:156), recomputed exactly), malformed
  numeric fields, unsafe member names (charset/absolute/`..`), non-zero directory sizes,
  truncation and nonzero trailing bytes are each rejected with a named stage (host
  prerequisite: `python3`); the dump must also pass `pg_restore --list`. Post-restore verification enforces
  database/schema/every-public-relation ownership by the app role (the reset runs AS that
  role), table DML and sequence privileges, and the EXACT public-only schema contract
  (creation schema `public`, `current_schemas(false)` exactly `{public}`, no temp schema) —
  substring matches like `public_shadow` cannot pass, and the NON-SYSTEM schema set of the
  database must be EXACTLY `{public}` (native exact-set comparison; extra or missing schemas,
  including empty results, fail closed).
  Known limitations: a failed mid-restore leaves a PARTIAL database (stop and review; the last
  backup remains the rollback); media is replaced only after a second typed confirmation and
  the previous media is NOT retained unless the operator saved it first. PAX/GNU extension
  headers are rejected outright at the byte level (their effective paths are never trusted);
  restore only archives produced by `dev-runtime-backup.sh`.
No successful restore/backup/health outcome is claimed until actually executed under Phase 2.

## Not claimed (Phase 1)
No live PASS, no migration executed, no port availability proven, no digest resolution for the
Node image, no SELinux runtime confirmation, no T021 route installed, no T033 readiness.

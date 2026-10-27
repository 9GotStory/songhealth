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
| Secrets | `songhealth-qdev-{db-password,migration-database-url,encryption-key,app-password}` | podman secrets, all created via stdin pipes (the `app-password` secret feeds the migration runner's `/run/secrets` reader); env files 0600 under `~/.config/containers/systemd/` |
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

## Partial-install recovery runbook (Phase 2 documentation only; authorizes nothing)

The installer is fail-closed and never adopts, resets or overwrites existing resources, so an
interrupted run leaves task-owned partial artifacts that a rerun refuses at its `exists` checks.
Recovery is always **manual, qdev-scoped, and separately Product Owner-authorized**: no script in
this repository performs cleanup, prune or reset. **Resource names alone are never ownership
evidence** — every destructive action requires the Track E provenance conjunction below.

Before touching anything, capture ownership AND provenance evidence (read-only):

```
podman ps -a --filter name=songhealth-qdev-
podman volume ls --filter label=io.songhealth.runtime=qdev
podman network inspect songhealth-qdev 2>/dev/null
podman secret ls | grep songhealth-qdev-
systemctl --user list-unit-files | grep songhealth-dev-
systemctl --user status songhealth-dev-network.service 2>/dev/null
ls -l ~/.config/containers/systemd/songhealth-dev-*
ls -l ~/dev/songhealth-quadlet/.songhealth-qdev-source-identity 2>/dev/null
```

### Stage table (order maps to `dev-runtime-install.sh`)

| Stage | Artifacts if interrupted | Data state | Safe stop / retention | Recovery track |
| --- | --- | --- | --- | --- |
| S0 preflight (tools, UID, manager, linger note, `exists`, port 4324, unit absence, pull, digest) | pulled `node:24.21.0` image only | none | nothing qdev-named exists | A |
| S1 checkout gates + identity marker | `.songhealth-qdev-source-identity` (untracked file) | none | marker only | A |
| S2 env files + 4 podman secrets | `songhealth-dev-{db,app}.env` 0600; `songhealth-qdev-{migration-database-url,encryption-key,db-password,app-password}` | credential material, no data | files/secrets only; nothing references them yet | A (cross-check B if DB already initialized) |
| S3 unit install + `daemon-reload` | five `songhealth-dev-*` unit files + generated systemd state | config only; no runtime resources | units loaded, nothing started | A |
| S4 volume creation + media marker | volumes `songhealth-qdev-{db-data,media}` (label `io.songhealth.runtime=qdev`), marker file | **provably empty OR initialized — must be proven, not assumed** | volumes retained | A if provably empty; B/C/D otherwise |
| S5 db start + fresh cluster init | running `songhealth-dev-db.service`, container, initialized db-data | **initialized PostgreSQL data** | stop db service (retains data) | B |
| S6 app-role provisioning (psql stdin) | role `songhealth_qdev_app` + ownership grants | initialized DB, no schema yet | stop db service | B |
| S7 migrations (throwaway runner; installer dies BEFORE app start) | possibly partially migrated schema | **partially migrated database** | stop db service; do NOT start app; do NOT rerun installer | C |
| S8 app enable+start | enabled+active app service + container | full runtime (or startup-failure state) | stop app then db | D |
| S9 verify (read-only) | none | — | rerun freely | — |

The `songhealth-qdev` **network** resource appears at first start of the generated
`songhealth-dev-network.service` (with the first consuming unit, i.e. S5 onward); its recovery is
defined separately below and is never implied by a stage row.

### Track A — uninitialized / provably empty resources (S0–S4 only)

- **Ownership/provenance evidence:** name/label match AND creation provenance per Track E.
- **Safe stop/retention:** nothing runs yet; retention is free — a retained empty volume/env
  file/secret/unit merely blocks installer rerun preflight (by design).
- **Data-preservation decision:** not applicable ONLY after emptiness is PROVEN. For volumes:
  `podman volume inspect` mountpoint plus `podman unshare find <mountpoint> -mindepth 1` returns
  nothing AND no `PG_VERSION` exists under the db-data mountpoint. An inspect error or any doubt
  ⇒ NOT empty ⇒ treat as Track B/C/D.
- **Recovery prerequisites:** Track E provenance recorded; for S2, note that regenerating
  credentials desynchronizes them from an already-initialized database (Track B) — credentials of
  an initialized runtime are never deleted as "cleanup".
- **Destructive action:** deleting env files/units/marker, `podman secret rm`, or `podman volume
  rm` of a PROVEN-empty volume — each only under explicit separate PO authorization.

### Track B — initialized PostgreSQL data (S5 onward, incl. after S6)

- **Ownership/provenance evidence:** as Track E (stage/resource-specific), plus the initialized
  cluster itself (`PG_VERSION`, `18/docker` layout) consistent with the recorded install session.
- **Safe stop / retention (plain, non-destructive):** stop `songhealth-dev-app.service` (if any)
  then `songhealth-dev-db.service` — volumes and data are retained. This plain stop performs
  **no backup**; the preservation path below is separate and runs its backup BETWEEN app-stop
  and DB-stop.
- **Data-preservation path (the ONLY sanctioned backup ordering — the backup happens BEFORE the
  database stops):**
  1. Stop the application service (`songhealth-dev-app.service`) per the approved procedure.
  2. Require CONFIRMED successful application shutdown and quiescence before proceeding. A
     failed or unconfirmed shutdown ⇒ **RETAIN everything and STOP the procedure** — no database
     shutdown, no forced termination, no disposal.
  3. With the database still RUNNING and ready (unit health / `pg_isready`), run the
     PO-authorized `dev-runtime-backup.sh`, producing the four-file set.
  4. Verify backup completion/integrity per the backup contract (all four files present AND
     `sha256sum --check --strict` passes on the manifest) BEFORE stopping the database.
  5. Only then stop `songhealth-dev-db.service`.
  `dev-runtime-backup.sh` is NEVER used after the database has stopped. If the database is
  already stopped without a backup: default ⇒ RETAIN everything and STOP (no destructive
  action); a DB-only restart solely to enable backup requires separate explicit PO
  authorization; if safe preservation is impossible ⇒ RETAIN.
- **Preservation decision before any disposal:** a verified backup set (path above) OR an
  explicit recorded PO no-backup decision. No disposal without one of these on record.
- **Recovery prerequisites:** verified backup set (or recorded no-backup decision) + Track E
  provenance.
- **Destructive action:** `podman volume rm songhealth-qdev-db-data` (and media per its own
  track state) — ONLY under explicit separate PO authorization naming the volumes. **Volume
  removal is never a routine recovery step for initialized data.**

### Track C — partially migrated database (S7 failure)

- **Ownership/provenance evidence:** as Track B, plus the failed migration output/journal as
  provenance of the partial state.
- **Safe stop/retention:** stop the db service; retain everything; capture
  `journalctl --user -u songhealth-dev-db.service` and the installer's migration failure output.
  Do NOT start the app against a partial schema; do NOT rerun the installer (preflight refuses
  existing resources anyway).
- **Data-preservation decision:** per Track B's backup-before-DB-stop sequencing (or a recorded
  PO no-backup decision) before any disposal; investigating in place needs no disposal. At this
  stage the application never started, so the sequencing applies from its backup step onward
  (backup while the DB runs, verify, then stop).
- **Recovery prerequisites:** review of the captured evidence; completing the migration is a NEW
  PO-authorized attempt decision (rerun authorization), not an automatic retry.
- **Destructive action:** same gate as Track B; additionally, DROP/RESET of schema objects is
  never performed outside the reviewed restore tooling.

### Track D — failed application startup (S8 failure)

- **Ownership/provenance evidence:** as Track B; the running/enabled units are the provenance.
- **Safe stop/retention:** capture `journalctl --user -u songhealth-dev-app.service` (and db)
  FIRST, then stop app then db; retain all data/config. Restart is an explicit reviewed operator
  action; no automatic restart loop beyond the unit's own `Restart=` contract.
- **Data-preservation decision:** per Track B's backup-before-DB-stop sequencing (journal
  capture while services run; stop app; confirm shutdown; backup while the DB runs; verify; then
  stop DB) or a recorded PO no-backup decision, before any disposal.
- **Recovery prerequisites:** root-cause review of the journal evidence; fix decisions require
  their own authorization (source or configuration change — none is implied here).
- **Destructive action:** same gate as Track B.

### Track E — ownership/provenance verification (prerequisite for EVERY disposal)

All four must hold; any gap ⇒ ownership UNPROVEN ⇒ fail-closed (no disposal; escalate to the PO
with the captured evidence):
1. **Name/label match:** `songhealth-qdev-*` / `songhealth-dev-*` names and, for volumes, label
   `io.songhealth.runtime=qdev`.
2. **Creation provenance — stage/resource-specific (provenance matrix below):** the evidence
   must match what actually exists at the interrupted stage; a rule that cannot be satisfied by
   a CORRECT installation (or by correct absence) at that stage is not valid evidence.
3. **No foreign references:** no unexplained containers attached to the network, no unexpected
   labels/annotations, no other unit or process referencing the resource.
4. **Recorded:** the resource appears in the install evidence pack's inventory.

#### Provenance matrix (what to compare, per resource and install state)

| Resource / install state | Required identity evidence |
| --- | --- |
| S0–S2 (units not yet installed) | name/label match of the artifacts that exist; inspect creation data aligning with the recorded session; no foreign references; presence in the recorded inventory. **No installed-unit check is required or possible at these stages.** |
| Units installed verbatim (`songhealth-dev.network`, `songhealth-dev-db.container`, `songhealth-dev-db-data.volume`, `songhealth-dev-media.volume`) | byte identity: `cmp` the installed unit against `deploy/dev-quadlet/<file>` at the approved candidate SHA recorded in the install evidence pack |
| The digest-rewritten app unit (`songhealth-dev-app.container`) | compare against the **expected rendered unit**: the approved source with the `Image=` line transformed exactly as the installer's `sed` does, using the **digest recorded in the install evidence pack** (digest provenance = that recorded resolution evidence; never re-derived from the tag at recovery time). **If the recorded digest evidence is missing: UNPROVEN ⇒ RETAIN — the digest is never reconstructed from a current tag lookup.** |
| Volumes / network / secrets | name/label match + inspect creation data + no foreign references + recorded inventory |

Strength unchanged: names or timestamps alone are never sufficient; any unexplained difference,
missing required record, or inspection error ⇒ UNPROVEN ⇒ RETAIN with no destructive action.

### Network recovery — `songhealth-qdev` (applies from first unit start onward)

- **Ownership/provenance verification:** the network is generated by the Quadlet unit
  `songhealth-dev.network` installed from the approved SHA's `deploy/dev-quadlet/songhealth-dev.network`
  (byte-compare the installed unit; `systemctl --user status songhealth-dev-network.service`;
  `podman network inspect songhealth-qdev` labels/creation time consistent with the recorded
  install session). Name alone proves nothing (Track E applies).
- **Referencing containers / dependencies:** `podman network inspect --format '{{range
  .Containers}}{{.Name}} {{end}}' songhealth-qdev` — ANY attached container blocks removal.
- **Required service stop order:** `songhealth-dev-app.service` → `songhealth-dev-db.service` →
  then the generated `songhealth-dev-network.service` (stops with its consumers; stop it
  explicitly only if it remains up). Re-inspect: zero endpoints required.
- **Retain vs remove:** retaining is always data-safe but BLOCKS installer rerun preflight
  (existing network ⇒ die) — the retry-vs-remove decision belongs to the PO.
- **Fail-closed conditions:** attached endpoint present, ownership unproven (Track E gap),
  inspect error, or unexpected labels ⇒ DO NOT remove; report.
- **Destructive action:** `podman network rm songhealth-qdev` only under explicit separate PO
  authorization, after the stop order and zero-endpoint verification; never force-remove.

### Cross-cutting rules

- Every cleanup/removal/disposal action requires explicit separate Product Owner authorization;
  this documentation defines procedure, not permission. No automatic retry, adoption or overwrite.
- Touch ONLY names `songhealth-qdev-*` / `songhealth-dev-*` and volumes labeled
  `io.songhealth.runtime=qdev`; never prune by age or glob beyond those names.
- The UID-1001 runtime (127.0.0.1:4322), the production stack and `supplies-dev-*` are never
  in scope for any recovery action.
- Non-destructive stop of a running runtime: `systemctl --user stop songhealth-dev-app.service
  songhealth-dev-db.service` — volumes/data are retained; restart is an explicit operator action.
  That plain stop performs no backup: the Track B preservation path runs its backup between
  app-stop and DB-stop and is never implied by this rule.
- Migration/app failures leave the database initialized (S5+) — treat as review-and-decide
  (Tracks B/C/D), never silently rerun the installer.

## Not claimed (Phase 1)
No live PASS, no migration executed, no port availability proven, no digest resolution for the
Node image, no SELinux runtime confirmation, no T021 route installed, no T033 readiness.

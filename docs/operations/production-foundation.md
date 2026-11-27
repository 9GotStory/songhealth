# Production Foundation Operations (Feature 001)

Operator documentation for the Songhealth production foundation: the rootless Podman + systemd
Quadlet deployment defined by `deploy/` (Feature 001, tasks T017–T020) and its accepted
verification contracts. This document describes the accepted deployment **as built**; it adds no
policy, unit, or mechanism.

**Authority** (in the repository's authority order): the repository rules in
[`CLAUDE.md`](../../CLAUDE.md);
[`docs/website-modernization-docs/current/10-system-blueprint.md`](../website-modernization-docs/current/10-system-blueprint.md)
§§2–3.1 and 17–20.1; the approved Feature 001 artifacts in
[`specs/001-platform-foundation/`](../../specs/001-platform-foundation/); and, as the as-built
evidence for every behavior claimed below, the committed deployment definitions themselves:

| Artifact | Task | Role |
|---|---|---|
| [`deploy/Containerfile`](../../deploy/Containerfile) | T017 | single pinned production OCI image |
| [`deploy/quadlet/songhealth.network`](../../deploy/quadlet/songhealth.network) | T018 | private application network |
| [`deploy/quadlet/songhealth-db-data.volume`](../../deploy/quadlet/songhealth-db-data.volume) | T018 | persistent PostgreSQL data volume |
| [`deploy/quadlet/songhealth-media.volume`](../../deploy/quadlet/songhealth-media.volume) | T018 | persistent media volume |
| [`deploy/quadlet/songhealth-db.container`](../../deploy/quadlet/songhealth-db.container) | T019 | private-only PostgreSQL 18.6 unit |
| [`deploy/quadlet/songhealth-app.container`](../../deploy/quadlet/songhealth-app.container) | T020 | application unit (startup gates) |
| [`tests/operations/verify-startup.sh`](../../tests/operations/verify-startup.sh) | T013 | startup-acceptance gate (S1–S6) |
| [`scripts/verify-readiness.mjs`](../../scripts/verify-readiness.mjs) | T012 | recurring readiness helper |
| [`tests/operations/verify-foundation.sh`](../../tests/operations/verify-foundation.sh) | T016 | production lifecycle verification harness |

**Verification status**: this document is a documentation-only deliverable (T021). T015 (US1) is
accepted with runtime evidence; T019 and T020 have independent static review PASS at this
baseline. Production runtime/durability evidence (executing the T016 harness on a
production-capable verification host) is the separately authorized T022 task and is **pending**;
the Recovery Set's backup and restore are §7.6 (#221, which replaced T024–T027), and their drill,
T028, waits for T022. See §11.

## 1. Scope, authority, and verification status

In scope here: installation, one-time provisioning, startup, start/stop/restart/recreation,
the Recovery Set's backup and restore (§7.6), cutting a Release (§7.7, Feature 016), readiness
interpretation, the private database boundary, and the external HTTPS/reverse-proxy boundary of the
Feature 001 production baseline.

Out of scope of Feature 001's baseline: selecting a reverse-proxy or monitoring product (Feature 001 explicitly
excludes both; §10 states the required boundary only), scheduled backups and keeping several
Recovery Sets (#221), any second production stack (Docker/Compose and Kubernetes are not
baselines), and any boot-time or scheduling policy the committed units do not define (§4.6).

Feature 016 (spec #450) settles three of these for the Production host, which Songhealth shares
with the office's other systems (`docs/adr/0009`): the proxy is Caddy at the host's level, a
Recovery Set is taken every night and kept off the host, and monitoring is split between
Songhealth's watch and the host's (`10` §3.1, §17, §18).
[`production-host-contract.md`](production-host-contract.md) states what Songhealth needs from the
host for each. §2 and §10 already name the proxy's place and the split watch; §7.6 describes the
Recovery Set taken by hand until the nightly set's ticket (#460) lands, and each Feature 016 ticket
brings this document to what it builds.

## 2. Production topology

```text
Internet
  -> external HTTPS/reverse-proxy boundary (the host's proxy, Feature 016; §10)
  -> host loopback 127.0.0.1:4321  (the ONLY publication — application port)
  -> systemd-songhealth-app  (Astro SSR + EmDash, non-root `node` user)
       -> private Podman network "songhealth"  (songhealth-network.service)
            -> systemd-songhealth-db  (PostgreSQL 18.6; NO published host port)

Named persistent volumes (survive all container replacement):
  songhealth-db-data -> /var/lib/postgresql   (PostgreSQL 18 PGDATA parent)
  songhealth-media   -> /app/media            (stable application media path)
```

Two containers, one private network, two named volumes, five Quadlet units under user systemd.
There is no separate backend, migration container, or orchestration layer: the application unit's
own startup sequence performs every gate before the server process starts (§6.2).

## 3. Prerequisites

- **Linux host with rootless Podman and user systemd/Quadlet.** Podman 6.1.3 is the researched
  reference release; the host must use a vendor-supported package whose Quadlet provides the
  `.container`/`.network`/`.volume`, health, and secret behaviors this deployment uses
  (verified against the v6.1.3 release-tag documentation in the T001 evidence). Record the exact
  host versions in runtime evidence — they are not pinned by this document.
- **Podman's init binary** at its default path `/usr/libexec/podman/catatonit`: the application
  unit runs it first in the container (`RunInit=true`, §7.1). Ubuntu 26.04's `podman` 5.7.0
  recommends the `catatonit` package, which installs that path (packages.ubuntu.com, read on
  2026-11-25 for #453); a host installed without recommends needs it installed by name.
- **A `/usr/bin/stat` that prints GNU coreutils' records** at that absolute path: the database
  unit's existing-store guard relies on that exact output contract (§6.1). Its availability, version, and behavior on
  the target host are **mandatory pre-adoption runtime evidence** — verify and record them
  before adopting a host (T022 records them; they are unverified until then). On Ubuntu 26.04
  that path is the uutils `stat` 0.10.0, which printed the guard's exact records on the rehearsal
  machine; the unit keeps `/usr/bin/stat` (§4.7).
- A non-root user account that will own the deployment, with the Quadlet units, environment
  files, and Podman objects created under that account (§4).
- The **accepted application image artifact** available in that user's rootless Podman storage
  (§4.5).
- External store-provisioning decisions already made: a target database name, a least-privilege
  application role and its separately protected credential, and provisioned persistent stores
  (§5).
- PostgreSQL client knowledge is not required on the host for ordinary lifecycle operation; all
  database verification in this deployment runs inside the containers with their own pinned
  tools.

## 4. Installation (rootless user systemd + Quadlet)

### 4.1 Place the Quadlet units

User systemd reads Quadlet files from the rootless search path; the conventional location is
`~/.config/containers/systemd/` (`$XDG_CONFIG_HOME/containers/systemd/`). Install the five
committed units and reload the user manager:

```bash
mkdir -p ~/.config/containers/systemd
cp deploy/quadlet/songhealth.network \
   deploy/quadlet/songhealth-db-data.volume \
   deploy/quadlet/songhealth-media.volume \
   deploy/quadlet/songhealth-db.container \
   deploy/quadlet/songhealth-app.container \
   ~/.config/containers/systemd/
systemctl --user daemon-reload
```

`daemon-reload` is required after installing **or changing** any Quadlet file: it re-runs the
generator that turns each file into a service. Inspect what the manager actually executes with
`systemctl --user cat songhealth-app.service` (the generated unit), not the source file alone.

Never edit the committed units on the deployment host to work around a refusal: each unit's
refusals name their prerequisite (§6, §8), and the T016 harness additionally verifies the
application unit's startup payload byte-for-byte against the accepted source. Install them
verbatim; deployment-specific values live in the external inputs (§4.3, §4.4), not in the units.

### 4.2 Generated unit, container, volume, and network names

Quadlet derives names mechanically; this deployment relies on the defaults:

| Quadlet file | Generated service | Runtime object |
|---|---|---|
| `songhealth-app.container` | `songhealth-app.service` | container `systemd-songhealth-app` |
| `songhealth-db.container` | `songhealth-db.service` | container `systemd-songhealth-db` |
| `songhealth.network` | `songhealth-network.service` | network `songhealth` (set by `NetworkName=`) |
| `songhealth-db-data.volume` | `songhealth-db-data-volume.service` | volume `songhealth-db-data` (set by `VolumeName=`) |
| `songhealth-media.volume` | `songhealth-media-volume.service` | volume `songhealth-media` (set by `VolumeName=`) |

The containers deliberately keep the Quadlet default container name (`systemd-<unit-base>`); the
volumes and network explicitly pin their names. The `Network=`/`Volume=` references in the
container units also generate systemd dependencies on the network/volume services, so starting
`songhealth-app.service` transitively prepares both volumes and the network and starts the
database unit first (`Requires=songhealth-db.service` + `After=`, with the database unit's
`Notify=healthy` making its "started" mean "healthy").

That dependency edge is ordering convenience, not proof of usability: if the database unit is
*skipped* by its input/store guards (§8.3), its start job completes without propagating an error
through the edge, and the application unit still fails closed at its own database-connectivity
prerequisites and startup gate. Each unit verifies its own boundary.

### 4.3 External environment files

Two operator-managed files supply the non-secret (and one secret-bearing) runtime inputs at the
systemd level. Both are loaded by `EnvironmentFile=` with the `%h` home specifier — no
host-specific absolute path is committed:

**`~/.config/containers/systemd/songhealth-db.env`** — the non-secret database bootstrap
identity, exactly two keys:

```ini
POSTGRES_USER=<bootstrap administrator name — an administrative identity, NOT the application's PGUSER>
POSTGRES_DB=<target application database>
```

The official PostgreSQL image initializes `POSTGRES_USER` as the cluster bootstrap administrator
*with superuser privileges* and creates `POSTGRES_DB` owned by it. That administrator is never
the application identity (§5.2). Only these two named variables are forwarded into the database
container — no other key in the file reaches it.

**`~/.config/containers/systemd/songhealth-app.env`** — the application runtime inputs, exactly
eight keys:

```ini
# PGPASSWORD is SECRET-BEARING (see the notes below): the application role credential.
HOST=127.0.0.1
PORT=4321
PGHOST=systemd-songhealth-db
PGPORT=5432
PGDATABASE=<target application database>
PGUSER=<least-privilege application role — enforced by the unit's startup prerequisites>
PGPASSWORD=<application role credential>
EMDASH_SITE_URL=<absolute production HTTPS origin>
```

Only these eight named variables are forwarded into the application container (bare-name
`Environment=` forwarding); no other key in the file reaches it. `systemd` does not expose
`EnvironmentFile` values in unit definitions, `systemctl show`, or the journal.

**EnvironmentFile comment/quoting rules — the credential must survive parsing exactly.**
`systemd` parses an `EnvironmentFile` with its own line parser, not shell semantics
(`systemd.exec(5)`; the v259 `parse_env_file` implementation). The bytes on the line are **not**
the value verbatim: comments, whitespace, quotes, and backslashes are all processed.

- A line whose first non-whitespace character is `#` or `;` is a comment and is ignored — this is
  the **only** comment form. There are **no inline comments**: in `KEY=VALUE`, everything after
  the `=` belongs to the assignment. An annotation placed after the value — even separated by
  spaces and a `#` — is preserved as part of the value, silently changing the credential and
  failing authentication. Keep annotations on their own comment line, as above.
- **Unquoted value:** leading whitespace is skipped and trailing whitespace trimmed; a value
  beginning with `"` or `'` is parsed as quoted instead. **Every backslash escapes the character
  that follows it and is itself dropped** — `PGPASSWORD=demo\value` parses as `demovalue`, not
  `demo\value`. Write a literal backslash doubled (`demo\\value` → `demo\value`), and never end
  the line with an odd trailing backslash (a backslash before the newline continues the line).
- **Double-quoted value (`"…"`):** the quotes are removed; whitespace inside — leading, trailing,
  interior — is preserved exactly; an unescaped `"` ends the value. A backslash escapes only
  `\`, `"`, `` ` ``, and `$` (backslash removed); before any other character the backslash stays
  literally, as in the shell.
- **Single-quoted value (`'…'`):** the quotes are removed and the content between them is
  **fully literal** — no escape processing at all, whitespace and `#` included. This is the
  exact representation for a credential containing backslashes, double quotes, `$`, spaces, or
  other parser-significant bytes, provided the credential itself contains no single quote (a
  single quote inside a value is carried bare in unquoted or double-quoted form instead).

The practical rule: keep nothing else on the line, and choose the representation that
round-trips the credential's **actual intended bytes** — unquoted when it contains no backslash,
no quote character, and no leading/trailing whitespace; single-quoted when it contains any of
those except a single quote; double-quoted (with `\`, `"`, `` ` ``, `$` escaped) otherwise. Do
not reshape the credential to suit the file: if authentication fails while the role and its
credential are otherwise confirmed, suspect the file's encoding first — fix the representation,
not the deployment, and never the value. The units never print values.

`PGHOST` must be `systemd-songhealth-db` — the database container's resolvable name on the
private `songhealth` network. `PGPASSWORD` is secret-bearing: protect the file (mode `0600`,
operator-owned). It lives in this host-protected file rather than a Podman file-secret because
the accepted recurring readiness contract (`scripts/verify-readiness.mjs`, run through
`podman exec` and as the container healthcheck) reads it from the container's configured
environment, which a file-mounted secret cannot satisfy. Consequently **`PGPASSWORD` is present
in the container's configured environment: raw `podman inspect` output, `--format` dumps of the
container `Env`, or any environment listing inside the container can disclose it** — treat such
output as secret-bearing and never paste it into evidence, tickets, or logs. The readiness
helper and all gate output are redacted and safe to share (§8.2).

Port and bind behavior is fixed by the deployment; do not vary it:

- `PORT` **must equal `4321`**. The committed publication is `127.0.0.1:4321:4321`, and an
  `ExecCondition` rejects any disagreeing `PORT` before any container exists, so the listener,
  the readiness probe, the healthcheck, and the publication cannot silently diverge.
- `HOST` stays `127.0.0.1`, the loopback application address of the accepted readiness contract
  (the helper probes `http://127.0.0.1:$PORT/` inside the container). The unit itself starts the
  server process with an in-container `0.0.0.0` bind as explicit deployment configuration —
  rootless port forwarding delivers published traffic to the container's network address, not to
  the container's own loopback — while the *external* boundary remains loopback-only: the host
  side of the publication binds `127.0.0.1` only, and the container's other interface is the
  private network shared only with PostgreSQL. No unintended interface is exposed.

A missing environment file fails the unit load before any container exists; a missing/empty
required key (or a disagreeing `PORT`) *skips* the unit (§8.3) — in every gated case no container
is created, no secret is read, and the healthy notification cannot fire.

### 4.4 Protected secret inputs

Three Podman secrets, created once by the operator and never committed. Create each from a
protected file (mode `0600`, outside Git), never from a value on the command line:

```bash
podman secret create songhealth-db-password <path-to-protected-file>
podman secret create songhealth-migration-database-url <path-to-protected-file>
podman secret create songhealth-encryption-key <path-to-protected-file>
```

| Secret name | Consumed by | Purpose |
|---|---|---|
| `songhealth-db-password` | `songhealth-db.container` via the image's native `POSTGRES_PASSWORD_FILE=/run/secrets/songhealth-db-password` | bootstrap administrator credential (initialization only) |
| `songhealth-migration-database-url` | `songhealth-app.container` startup command (read from `/run/secrets/`, exported only into the application process environment) | `EMDASH_MIGRATION_DATABASE_URL` — the migration connection URL, whose embedded password is part of the secret |
| `songhealth-encryption-key` | `songhealth-app.container` startup command (same mechanism) | `EMDASH_ENCRYPTION_KEY` — required at runtime, exists only in the runtime environment, with an independently protected recovery copy |

The two application secrets are mounted read-only as files and are **not** part of the
container's configured environment, so `podman inspect` cannot leak them; anything that dumps
the *application process* environment can. Missing secrets fail container creation. Keep an
independently protected recovery copy of every required runtime secret
(`runtime-secret-recovery.md`).

**Identity matching.** The migration URL inside `songhealth-migration-database-url` must
identify the **same intended database** as the `PG*` inputs — same host (`systemd-songhealth-db`),
port (`5432`), database (`PGDATABASE`), and user (`PGUSER`). Agreement is enforced by the
startup gate (S1) by comparing the non-secret identity components only, and re-proved in S3
against the native inspected target label; the password and full URL are never printed. A
disagreement skips/blocks startup naming the mismatching field only.

### 4.5 Application image identity and availability

Every production image is pinned by explicit version **and** immutable digest:

- Application: `localhost/songhealth-app:1.0.0-rc.1@sha256:316d4f748127ad1314d48190b7e2baaac3063a3eaecdad6678b9076138eca1c7`,
  the release candidate for the rehearsal, built from `38bc570` (#455; its record and archive:
  §7.7). Feature 001's accepted artifact,
  `localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407`,
  was pinned until this change and stays on the workstation as a record.
- PostgreSQL: `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf`
- The application image's build base is itself digest-pinned inside the Containerfile
  (official Node 26.13.0 image since #101), on which 1.0.0-rc.1 was built; Feature 001's 0.0.1
  was built on Node 24.21.0.

Podman resolves the digest against local image storage, so any other or rebuilt image fails
container creation closed. Two consequences for operators:

1. **The pinned application image must be present** in the deployment user's rootless Podman
   storage (inspectable as `localhost/songhealth-app@<the digest the unit pins>`). A fresh
   `podman build -f deploy/Containerfile …` does **not** satisfy the pinned identity: default
   image builds are not bit-reproducible across build times, so a rebuilt image has a different
   digest by construction. A Release's image is built on the workstation only and moved to the
   host as an archive (`10` §3.1, "Two builds"): never build an image on the Production host.
   That is not the startup build, the application's own build that the startup gate runs inside
   the container at every start (§6.2), which stays.
   - **Where Feature 001's artifact is.** As of 2026-10-29 (Feature 002 T037) it is held in the rootless Podman storage of `thanakorn` (UID 1000). Its build account, UID 1001,
     was retired.
   - **Moving it.** Move it between accounts or hosts with
     `podman save --format oci-archive --uncompressed` and `podman load`, which keep the
     manifest digest of an image whose manifest lists uncompressed layers, as Feature 001's
     0.0.1 does. Podman 6.2.0's `podman build` compresses the layers its manifest lists unless
     given `--disable-compression=true`, and such an image saved `--uncompressed` loads with
     another digest (#455, measured on the workstation, 2026-11-25); `docker-archive` changes
     the digest of either. A Release's image is therefore built uncompressed, and its cut loads
     the archive into an empty store to read the digest back (§7.7).
2. **Changing the accepted build is a review-gated change to the pinned identity** in the
   committed unit — never an automatic re-pin, and never a fallback to a bare mutable tag or
   `latest`. (The PostgreSQL image is an upstream registry reference and is pulled by digest if
   absent.)

### 4.6 User-session lifetime and boot persistence

User units run under the per-user service manager (`user@.service`). By default that manager
exists only while the account has at least one login session open, and it — with every unit
under it, including this deployment — terminates when the last session closes. Two independent,
operator-owned decisions control lifetime; the committed units deliberately define **no
boot-time enablement policy** of their own:

- **Keep the manager running across logout/boot (enables unattended operation):** enable
  lingering for the deployment account, once, with administrator assistance:

  ```bash
  sudo loginctl enable-linger <deployment-user>
  ```

  With lingering enabled, the user manager starts at boot even with no login session and is not
  terminated on logout. Without it, plan for an active login session whenever the platform must
  run, or accept that it stops with the last session.

- **Start the units automatically when the manager starts (boot enablement):** the services the
  Quadlet generator emits are transient from systemd's perspective — `systemctl --user enable
  songhealth-app.service` is not the mechanism. Instead, the generator applies an `[Install]`
  section from the Quadlet source (or a drop-in) at generation time, the same way `systemctl
  enable` would. To enable the application unit without modifying the committed file, add a
  drop-in next to it and regenerate:

  ```bash
  mkdir -p ~/.config/containers/systemd/songhealth-app.container.d
  printf '[Install]\nWantedBy=default.target\n' \
    > ~/.config/containers/systemd/songhealth-app.container.d/10-enable.conf
  systemctl --user daemon-reload
  systemctl --user is-enabled songhealth-app.service
  ```

  (Repeat for `songhealth-db.container` if the database should also start on its own; the
  application unit already pulls the database unit in via its dependency edge.) Enabling a unit
  does not start it now — combine with §7.1, and note both decisions are deployment choices this
  baseline documents but does not prescribe.

### 4.7 An Ubuntu Server 26.04 host (Feature 016)

What an Ubuntu Server 26.04 host needs, as it was done on the rehearsal machine (#456: Ubuntu
26.04.1 LTS from the official cloud image, kernel 7.0.0-43, Podman 5.7.0, 4 vCPU and 6 GB;
rehearsal evidence only, spec #450 "The rehearsal"). The host's own part (Caddy, the private
network, the certificate files and the two snippets Songhealth's site imports) is the host's
project ([`production-host-contract.md`](production-host-contract.md)); the rehearsal used a
throwaway stand-in, `scripts/rehearsal/stand-in.sh`.

1. **Root steps, by the Operator.** From a checkout at the Release record's
   `deploymentConfigCommit` (§7.7), with Songhealth's site file and the public key Claude Code
   will use copied to the host (the Operator's own copy, by their own means):

   ```bash
   sudo bash root-setup.sh --account <deployment account> --authorized-key <public key file> \
     --site-config songhealth.caddy --caddy-sites-dir <directory the host's Caddyfile imports> \
     [--caddyfile <the host's Caddyfile, when not /etc/caddy/Caddyfile>]
   ```

   [`scripts/host/root-setup.sh`](../../scripts/host/root-setup.sh) explains each step and waits
   for a yes: the packages below, the account without sudo and its subordinate ranges, lingering
   (§4.6), the account's SSH key, the secrets and both environment files (§4.3, §4.4) with a
   root-only recovery copy the Operator moves to their protected store
   ([`runtime-secret-recovery.md`](runtime-secret-recovery.md) §5), and the site file placed and
   Caddy reloaded; a site file Caddy refuses is taken out again before any reload. It prints no
   secret and replaces none that exists.
   From here on Claude Code works as the account over SSH, and copies `install-node.sh`,
   `provision-stores.sh`, the Release's folder and the units from the same checkout to the
   account's home with `scp`.
2. **Node, as the account.** `bash install-node.sh <version>` with the version `package.json`
   pins (`engines.node`): [`scripts/host/install-node.sh`](../../scripts/host/install-node.sh)
   downloads the official Linux x64 archive, checks it against the release's `SHASUMS256.txt`
   and unpacks it under `~/.local/opt`, then removes the `npm`, `npx`, `corepack` and C headers
   the archive carries, so `node` alone stays. Nothing else is installed: no package, dependency
   or toolchain.
3. **The Release's image, as the account.** Copy the Release's folder (§7.7) to the host, then
   `sha256sum -c songhealth-app-<version>.oci.tar.sha256`,
   `podman load --input songhealth-app-<version>.oci.tar`, and compare
   `podman image inspect localhost/songhealth-app:<version> --format '{{.Digest}}'` with the
   record's `digest`. Nothing is built on the host; the startup build runs inside the
   application's container at every start (§6.2).
4. **The units.** Copy the five files of `deploy/quadlet/` at `deploymentConfigCommit` into
   `~/.config/containers/systemd/` (§4.1), add the boot drop-in for the application unit (§4.6) and
   run `systemctl --user daemon-reload`.
5. **The stores, once.** `bash provision-stores.sh`
   ([`scripts/host/provision-stores.sh`](../../scripts/host/provision-stores.sh)): Phase A (§5.1),
   the application role (§5.2) and the media store with its marker (§5.3). It refuses a store
   that is not empty.
6. **Start.** `systemctl --user start songhealth-app.service` returns once the container is
   healthy (§6.2); `podman exec systemd-songhealth-app node scripts/verify-readiness.mjs` reports
   `ready`. Then run the deployed-stack check through the proxy (§10, `scripts/stack-check.ts`),
   which asks the site from an allowed device and from a source outside the allowed network, which
   gets no page.

**Where Ubuntu differs** (each seen on the rehearsal machine; Product Owner, #456 comments
7164993353 and 7166769976):

| Difference | Seen | Done |
|---|---|---|
| Podman 5.7.0, where the units were written on Fedora's 6.x | The generator produced the five services; every key the units use started as written, `Notify=healthy`, `HealthCmd`, `Secret` and `PublishPort` included | Nothing changed |
| Packages Podman only recommends | The cloud image has no `uidmap`; without recommends there is no `catatonit`, and `netavark` lacks `aardvark-dns`, so the application's gate failed with `EAI_AGAIN` resolving the database's name | `root-setup.sh` installs `podman uidmap passt catatonit dbus-user-session aardvark-dns nftables` by name, without recommends. A database started before `aardvark-dns` existed must be restarted once |
| `/usr/bin/stat` is uutils 0.10.0 (GNU's is `/usr/bin/gnustat`) | The guard's command under `podman unshare` printed the same records as GNU's on the real store, and matched on an empty file, a symbolic link and a missing path; only standard error differs | The unit keeps `/usr/bin/stat`; T022 records it again |
| AppArmor and `pasta` (Launchpad 2154379) | Each stop logs one denial: profile `pasta` refuses `SIGTERM` from `podman`. The rootless network's teardown still completed in three stop/start cycles | No safeguard changed; the denial is recorded as known |
| The same denial, on the database unit (#459) | When the database, the last container on the rootless network, stops, its `ExecStop` (`podman rm`) exits 125 on `rootless netns: kill network process: permission denied`, so `songhealth-db.service` ends a planned stop `failed`, result `exit-code`: nine stops of nine in the T016 run. No `pasta` is left running, and the next start leaves the unit `active`, result `success`. Taking a Recovery Set (§7.6) stops the application alone and does not meet it | No safeguard and no unit changed (Product Owner, #459 comment 7213181563); the watch (#462) does not alert on it after a planned stop, and the Production host is read again (#466, #467) |
| PostgreSQL under Linux 7.0 (release notes, known issues) | `huge_pages` is `try`, its status `off`: the host reserves no huge pages | Recorded; #464 measures with and without before anything is proposed |
| `sudo` is sudo-rs | The Deployment account is refused | Nothing changed |

**Measured on the rehearsal machine** (4 vCPU, 6 GB, no swap used): the first start, with 90
migrations applied, 35.7 s from `systemctl --user start` to healthy; later starts 34 to 42 s; the
application healthy 68 s after boot with nobody logged in. The application service's peak memory
2,469 MiB and the whole machine's 2,549 MiB used during the first start. The comparison of host
sizes is #464's.

**Measured over the T016 harness's run** (#459, 2026-11-27, 1.0.0-rc.1, the same machine; record
[`docs/evidence/459-t022-rehearsal.md`](../evidence/459-t022-rehearsal.md)), from the user
journal's `Starting`/`Started` and `Stopping`/`Stopped` lines: the whole run 323.3 s; the
application unit's start, with the database already healthy, 22.5 to 24.2 s (ten starts); the
database's start 6.0 to 6.5 s (nine); the application's stop 0.36 to 0.53 s, ending `inactive`
(ten); the database's stop 0.51 to 0.63 s (nine, each ending `failed`, above). The application
service's peak memory, read from its cgroup's `memory.peak` every second, 2,526 MiB (2.4G at each
start by systemd's own count), the database service's 87 to 89 MiB, and the whole machine's at most
3,023 MiB used of 5,919 MiB.

## 5. One-time store provisioning

Initialization is always an explicit, operator-executed act. Neither unit contains an
initialization, fallback, or repair path: the database unit only ever *starts an
already-initialized store* (§6.1), and the application unit only ever *attaches to an
already-provisioned media store* (§5.3). A missing `PG_VERSION` never authorizes automatic
initialization or reset.

### 5.1 Database store — explicit initial provisioning (Phase A)

Phase A is a one-shot operator procedure, executed once per store; the authorization is the act
of running it, and nothing persists as an armed state. The authoritative fail-closed procedure —
including the exact store-emptiness verification and the strict configuration parser — is
embedded in the
[`songhealth-db.container`](../../deploy/quadlet/songhealth-db.container) header; the steps:

1. **Create the volume and confirm the secret.** `podman volume create songhealth-db-data`
   (idempotent; only if absent), and ensure the Podman secret `songhealth-db-password` exists.
2. **Verify the store is GENUINELY EMPTY.** Resolve the volume mountpoint
   (`podman volume inspect --format '{{.Mountpoint}}' songhealth-db-data`) and prove emptiness
   under `podman unshare` with an exact sentinel comparison of `/bin/ls -A` output — a failed
   query or listing is never treated as success, and any content at all (even a single entry)
   fails the check. A store without `PG_VERSION` but *with* any other content is a partial
   state: provisioning refuses it (§6.1, states S1–S5).
3. **Load and validate the provisioning configuration with the strict parser** — never by
   shell-sourcing `songhealth-db.env`. The grammar is a byte grammar over the raw file: exactly
   the two records `POSTGRES_USER=<value>` and `POSTGRES_DB=<value>`, each value one or more
   characters of `[A-Za-z0-9_]`; no whitespace, quotes, escapes, comments, blank lines, other
   keys, duplicates, NUL, control, or non-ASCII bytes anywhere (a final record may end at EOF
   without a trailing newline). Validation runs on the raw bytes before any shell extraction,
   every command's exit status is checked independently, and both identities are re-validated
   after extraction. Any out-of-grammar input refuses provisioning outright.
4. **One-shot initialization** with the exact approved digest, explicit validated values only
   (never `--env-file`; `PGDATA` is never delivered, so the image default —
   `/var/lib/postgresql/18/docker`, under the mounted persistent parent — is the only one in
   effect):

   ```bash
   podman run -d --name songhealth-db-provision \
     --network none \
     --volume songhealth-db-data:/var/lib/postgresql \
     --secret songhealth-db-password \
     -e POSTGRES_USER="$POSTGRES_USER" \
     -e POSTGRES_DB="$POSTGRES_DB" \
     -e POSTGRES_PASSWORD_FILE=/run/secrets/songhealth-db-password \
     docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf
   ```

   No credential appears on the command line: the two `-e` values are the validated non-secret
   identities, and the password arrives only through the secret file. The container runs with
   `--network none` — it needs no network.
5. **Accept on FINAL-SERVER identity, not on initialization having run.** The image's entrypoint
   initializes with a temporary server, stops it, and only then execs the final server. All
   three checks must pass against that final server:
   - the final `ready to accept connections` record in `podman logs songhealth-db-provision`;
   - `podman exec songhealth-db-provision pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`
     exits 0 (availability only — `pg_isready` does not verify identity);
   - SQL identity matches the strictly parsed values:
     `podman exec songhealth-db-provision psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc
     "select current_database()"` equals `POSTGRES_DB`, and the same with
     `"select current_user"` equals `POSTGRES_USER`.
6. **Clean up and hand over to normal startup:** `podman rm -f songhealth-db-provision`; then,
   if the unit file changed since the last reload, `systemctl --user daemon-reload`, and
   `systemctl --user start songhealth-db.service` (normal startup, §6.1, passes on the
   now-initialized store).

Interrupted provisioning is classified into five states; **none is ever resolved automatically**
(no deletion, reset, cleanup, repair, or `initdb` retry over an unverified store — a missing
`PG_VERSION` is never treated as proof of an empty store):

| State | Condition | What happens |
|---|---|---|
| S1 | verified-empty store | eligible for Phase A |
| S2 | partial store without `PG_VERSION` (files/directories present) | normal startup refuses; Phase A refuses (not verifiably empty); recovery requires explicit operator investigation and a deliberate, humanly-authorized reset decision |
| S3 | `PG_VERSION` present but provisioning incomplete (intended database/user missing) | startup may classify the structure and the container may run healthy — completed provisioning is NOT presumed; application acceptance is independently blocked by the application unit's prerequisites; recovery is an explicit operator decision |
| S4 | final server ran but identity verification incomplete | not accepted as provisioned; verify or recover explicitly |
| S5 | fully provisioned and verified | eligible for normal startup |

In every state, PostgreSQL health, completed provisioning, and application acceptance remain
three distinct facts (§8.1).

### 5.2 Least-privilege application role

Before application use, provision — from external deployment configuration, against the running
database — the one stable, least-privilege application role matching `PGUSER`, with its own
separately protected credential (never `songhealth-db-password`, never the bootstrap
administrator). Required end state, exactly:

- the role exists and is **not** `SUPERUSER` and holds neither `CREATEDB` nor `CREATEROLE`
  (which also structurally rejects the bootstrap administrator);
- `CONNECT` on the target database; `USAGE` and `CREATE` on schema `public`;
- DML privileges (tables: `SELECT`/`INSERT`/`UPDATE`/`DELETE`; sequences:
  `SELECT`/`USAGE`/`UPDATE`), and ownership or inherited ownership of the EmDash objects it
  creates.

The commands are [`scripts/host/provision-stores.sh`](../../scripts/host/provision-stores.sh), run
once as the Deployment account with §5.1 and §5.3 (Feature 016, #456; Product Owner, #456 comment
7166769976); their evidence stays out of the repository. The application unit enforces this end state itself **before every start**, before
any migration mutation, by connecting exactly as the configured `PG*` identity through the
application's pinned `pg` client and verifying every condition above, plus the **public-only
schema contract on both connection paths** (the `PG*` application connection and the migration
URL connection, independently): `current_schema()` must be `public`, the effective lookup path
`current_schemas(false)` minus the documented `pg_catalog` system lookup must be exactly
`[public]`, and `pg_my_temp_schema()` must be `0`. A database with no EmDash objects yet is the
legitimate pre-first-migration state and passes; after the first native apply the role owns the
objects it created. Any violation names the failed prerequisite or object only (identity
components are non-secret; credentials never print) and blocks the start.

### 5.3 Media store and `.songhealth-media-store`

The persistent media store must already exist as an explicitly provisioned store before the
application unit can start:

1. **Create the named volume** (`podman volume create songhealth-media`) or attach the intended
   existing store — the unit mounts it at `/app/media`, the stable application media path (no
   `MEDIA_DIRECTORY` input exists).
2. **Create the operator-managed existing-store marker exactly once, when provisioning the
   store**: a small non-secret provisioning record named `.songhealth-media-store` at the root of
   the media volume (for example an ISO-8601 timestamp and host identifier), readable by the
   application's non-root runtime user. Host-side access to the volume's contents follows the
   same `podman unshare` pattern Phase A uses for the database store.

Why the marker exists: Podman creates a missing named volume as an empty replacement
automatically, which a mount-only check cannot distinguish from the operator's existing store.
The application unit therefore proves two things in order at startup: `/app/media` is a real
mount point (the image ships an empty placeholder directory that an omitted attachment would
otherwise silently present as a writable replacement store), and the marker is present and
readable. A deleted-and-recreated volume, a wiped store, or an unprovisioned deployment has no
marker and the unit refuses to start — it never creates, initializes, or repairs the store.

**The marker is a provisioning record, not a repair tool.** Creating it is legitimate only while
deliberately provisioning a new store. It must never be created to legitimize a missing or
replaced existing store: if the store disappeared or was replaced unexpectedly, that is an
incident to investigate (was the volume deleted? is this the right host?), not a condition to
paper over — a store re-marked after replacement presents empty media as if it were the
operator's existing content. Ordinary lifecycle and container recreation (§7.2) never touches
the marker or the volume.

## 6. Startup

### 6.1 Normal startup (Phase B) — the existing-database-store guard

Normal startup contains **no initialization path of any kind**: no provisioning marker, no
fallback, and no inspection outcome — including a failed, ambiguous, or errored inspection —
ever authorizes initialization. Before the database container is created, an `ExecCondition`
guard validates the existing store:

1. `podman volume inspect` resolves the named volume's data directory; a failed query, nonzero
   exit, or unusable path refuses the start (named-volume *existence* is never treated as store
   validity).
2. Four positive, non-following metadata classifications run under `podman unshare` (the
   rootless user namespace — `initdb` creates `PGDATA` mode 0700 owned by a subordinate UID the
   runtime user cannot traverse outside the namespace), bottom-up, each through only
   previously classified plain-directory parents, using
   `LC_ALL=C /usr/bin/stat -c "%F %s" -- <component>`: the data directory, `<data-dir>/18`, and
   `<data-dir>/18/docker` must each classify exactly as `directory <digits>`, and
   `<data-dir>/18/docker/PG_VERSION` as `regular file <digits>` with strictly positive size.
   Each result requires `stat` exit 0 (checked independently) AND a single record exact within
   the trusted output representation: type prefix proven present, digits-only size by character
   class, sentinel-preserved terminator, no extra records. Any nonzero exit (an error is never
   interpreted as absence), symlink (never followed), unknown type, bare numeric result,
   signed/spaced/malformed size, zero-size `PG_VERSION`, or extra output refuses the component
   and the unit — before any container exists, so the entrypoint and `initdb` never run against
   a refused store.
3. Only successful classification of every component proceeds to native PostgreSQL startup,
   where the image entrypoint makes its own independent `PG_VERSION` skip-initialization
   decision on the same path. A non-empty `PG_VERSION` is initialization *evidence*, never a
   guarantee of integrity — a corrupt cluster passes this gate and is then refused by PostgreSQL
   itself (native startup failure, never healthy; the restart policy with systemd's start-rate
   limiting bounds the retry; nothing is repaired).

**Trusted GNU stat output contract.** The record validation is exact within the supported output
representation of an authentic GNU `/usr/bin/stat` invoked with the fixed format string,
`LC_ALL=C`, non-following classification, and the `--` argument boundary. Its explicit
assumptions — that `/usr/bin/stat` under `podman unshare` is the authentic GNU coreutils `stat`
at its absolute path, with the format string fixed by the unit — make the target host's `stat`
availability, version, and behavior **mandatory pre-adoption runtime evidence** (§3): verify and
record them before adopting a host. A known, documented limitation remains: shell command
substitution discards NUL bytes, so a hypothetical emitter *other* than authentic GNU stat could
produce a byte stream that normalizes into an accepted record; acceptance is restricted to the
verified GNU stat contract, and the text-level validation rejects every deviation representable
in that output.

**Non-mutating inspection.** The validation's syscall set is one non-following `lstat` per
component plus Podman's own metadata-database read: no file content is read, no directory is
enumerated, no symlink is followed, no container is created, nothing is mounted. (Kernel-level
non-mutation claims are source-derived; runtime proof is deferred to authorized runtime
verification — §11.)

**Coordination window (approved Option A).** From the first store-inspection `ExecCondition`
until the instant the native PostgreSQL entrypoint completes its skip-initialization decision,
no external host process, tool, automation, or administrator may modify database file contents,
directory entries or contents, symlinks or targets, ownership/permissions/metadata, mounts or
storage mappings, named-volume identity or lifecycle, or any other persistent-store state capable
of changing the validation result. Non-following classification protects each inspection's final
component; a previously classified parent replaced (for example by a symlink) between inspections
could redirect a deeper component's resolution — the guard is not independent protection against
a violating actor. This **residual race risk is explicitly accepted by the Product Owner**,
documented rather than eliminated; no locking architecture is added. The honest three-claim
boundary: the unit does not prevent Podman from creating a missing named volume as an empty
replacement; it does prevent PostgreSQL from ever initializing it; and it does prevent the unit
from ever reporting active or healthy on it.

### 6.2 Application unit startup sequence

One container, one startup payload, in order — every failure exits nonzero before the
application starts, the unit follows its restart policy, and each verdict plus the gate's full
`[S1..S6]` PASS markers land in the unit journal (`journalctl --user -u songhealth-app.service`):

1. **Media attachment proof** — `/app/media` must be a real mount point; refusal names the
   missing attachment (§5.3, §8.4).
2. **Existing-store marker proof** — `.songhealth-media-store` present and readable (§5.3).
3. **Secret reads** — the two Podman secrets are read into the process environment; missing
   secret files surface as named missing inputs in the gate's S1.
4. **Least-privilege application-role and public-only schema prerequisites** (§5.2), on both
   connections, strictly before any migration mutation, printing one secret-safe verification
   line on success.
5. **The accepted T013 startup-acceptance gate**, as-is, through the committed
   `verify:startup` mapping — S1 input/identity validation (`PG*` vs migration URL by non-secret
   components) → S2 the exact application rebuild in place and its native
   `.emdash/migrations.json` manifest checks (identity, secret-freeness, checksum) → S3
   `emdash migrate --status --json` target inspection and fingerprint derivation → S4 apply with
   the inspected-target fingerprint guard (`--expected-target-fingerprint`), then re-inspection
   requiring zero pending and zero unknown → S5 `emdash migrate --check` (applies nothing) →
   S6 one bounded disposable media write/read/remove probe (exclusively claimed, no residue).
   Migration state or media-writeability failure blocks startup acceptance — a failed gate can
   only retry or stay down, never escalate to healthy.
6. **Only then** the native standalone server emitted by that exact build is exec'd
   (`node dist/server/entry.mjs`) with the in-container `0.0.0.0` bind (§4.3).

The migration/write probes are **startup-only**: recurring readiness never migrates and never
writes persistent media (§8.2). No migration container, migration service, or orchestration
layer exists anywhere in this sequence.

### 6.3 Startup time ceiling

`TimeoutStartSec=3600s` on the application unit is the Product Owner-accepted operational policy
ceiling **per start attempt**: 3450 s of bounded command allowance (the in-place rebuild at
900 s + 30 s kill-after; four sequential bounded native CLI calls at 600 s + 30 s each) plus a
150 s overhead reserve for everything else — prerequisite connections, container start and
npm/npx startup overhead, the S6 media operations, server boot, and the first healthcheck pass
that releases the startup notification. The reserve is **unverified**: the S6 filesystem
operations and standalone server startup have no independently proven wall-clock limits, so
**no overall worst-case duration is claimed**. A start attempt whose legitimate progress exceeds
the ceiling is terminated by systemd; that possibility is accepted by the Product Owner decision
rather than eliminated by the unit, and actual startup durations remain subject to separately
authorized runtime validation (§11).

## 7. Lifecycle operations

### 7.1 Start, stop, restart

```bash
systemctl --user start songhealth-app.service      # also starts the database unit first
systemctl --user status songhealth-db.service songhealth-app.service
systemctl --user restart songhealth-app.service
systemctl --user stop songhealth-app.service songhealth-db.service
journalctl --user -u songhealth-app.service -e     # startup-gate verdicts and gate markers
```

Starting the application unit orders the database unit first (§4.2). "Started" for the database
unit means *healthy* (`Notify=healthy` over `pg_isready`); "started" for the application unit
means the startup gates passed **and** the aggregate readiness helper passed at least once
(§8.1). Stopping the database unit also stops the application unit through the dependency edge —
stop both explicitly (as above) for a full platform stop. Both units restart after unplanned
container exits (`Restart=always`, `RestartSec=5s`); an explicit `systemctl --user stop` is never
restarted, and systemd's built-in start-rate limiting bounds any retry loop, so a persistently
failing startup gate can only retry within those bounds or stay down — it never escalates to
healthy.

**How the application stops** (#453; Product Owner, #453 comment 7158951848). Podman's init runs
first in the application container (`RunInit=true`) and passes the stop signal to the server, which
ends at once: as the container's first process it would ignore SIGTERM and be killed when Podman's
10 s stop timeout ran out (#67). The server exits 143 (128 + SIGTERM), which the unit counts a
success (`SuccessExitStatus=143`), so after `systemctl --user stop` the unit is `inactive`, not
`failed`. A request in flight when the stop arrives is cut, and the client keeps the part of the
response it has received. The startup gate does not change.

Workstation figures (#453, 2026-11-25; 8 CPUs, 15 GiB, Podman 6.2.0, shared with other work): three
runs of `scripts/production-image-check.sh`, on the images built at `2906e45`, `d0c04e5` and
`8658970`, give each range. They are no sizing for a host: the rehearsal and the Production host record their own (spec
#450).

| What | Figure |
|---|---|
| The startup gate's build (S2), as the runtime user, no network | 12.4 to 19.4 s; peak memory 2,093 to 2,164 MiB |
| The server, from the container's start to serving `/` (no startup gate) | 2.48 to 3.82 s |
| The server's peak memory while serving the check's requests | 123 to 150 MiB |
| `podman stop`, with Podman's init | 0.35 to 1.41 s, exit 143, no kill |
| `systemctl --user stop` of a throwaway Quadlet unit with `RunInit=true` and `SuccessExitStatus=143` on the `d0c04e5` image | 1.43 s, `inactive`, result `success` |
| `podman stop` with Feature 001's unit (no init), on this Containerfile's image | 10.41 s, exit 137 after SIGKILL |
| `systemctl --user stop` of the same throwaway unit without either key | 11.21 s, `failed`, status 137 |

The whole start also holds the role prerequisite and the gate's migration steps and media probe,
which need the production stack and are measured on the rehearsal machine.

### 7.2 Container recreation retaining both named volumes

Recreation is native to the generated units' stop/start lifecycle — **no manual `podman rm` step
exists or is needed**. The Quadlet-generated service for each `.container` unit starts its
container with `podman run … --name systemd-<unit> --replace --rm` and stops it with
`podman rm -v -f -i <container>` (plus an ignored-failure repeat in `ExecStopPost` that covers a
killed-conmon stop), per the reference v6.1.3 generator. Consequences:

- an ordinary successful `systemctl --user stop` **already removes the container** — there is no
  stopped container left to remove, and a manual `podman rm` would merely report that no such
  container exists;
- the next `systemctl --user start` **creates a fresh container** (the `--replace` flag also
  clears any same-name leftover from an abnormal shutdown);
- both named volumes — `songhealth-db-data` and `songhealth-media`, with their identities and
  contents — are never deleted or recreated by any lifecycle operation: stop/start/recreate
  touches only the ephemeral container.

**Application-only recreation** (the database unit is never stopped and stays active/healthy):

```bash
systemctl --user stop songhealth-app.service
systemctl --user start songhealth-app.service
```

This reruns the application unit's own startup sequence only (§6.2: media attachment and
existing-store-marker guards, secret reads, least-privilege role and public-only-schema
prerequisites, the T013 gate S1–S6, server exec). The database unit's existing-store guard does
**not** rerun — the database unit was not reactivated.

**Full-platform or database-container recreation.** Stopping the database unit propagates the
stop to the application unit through the dependency edge, and starting the database alone does
**not** start its dependent application — restore the application explicitly:

```bash
systemctl --user stop songhealth-app.service songhealth-db.service
systemctl --user start songhealth-db.service    # store guard reruns; refusals skip (§8.3)
systemctl --user start songhealth-app.service   # full application startup sequence reruns
```

(The last two commands may be collapsed into a single
`systemctl --user start songhealth-app.service`: its dependency edge orders the database unit
first and, **when the database unit activates successfully**, its `Notify=healthy` holds the
application's own prerequisites until PostgreSQL is healthy. That guarantee is conditional: if
the database unit is instead **skipped** by its `ExecCondition` guards (§8.3) — refused inputs or
a refused store — its start job completes without failing the application's start job through
the dependency edge, and the application's own database prerequisites then execute and refuse
connectivity. The ordering edge is convenience; the application's independent gate is the
fail-closed boundary, exactly as in §4.2.)

Which guards rerun per sequence: reactivating the **database unit** reruns its `ExecCondition`
guards — the identity-input presence checks and the existing-store guard of §6.1, which validates
the existing store and never initializes it; reactivating the **application unit** reruns its
full startup sequence of §6.2. The migration status/apply/check sequence is idempotent —
against an already-migrated database the apply is a verified no-op — and the media probe removes
its own file. Verify afterwards with the readiness checks of §8. The three-cycle version of this
exercise (start, stop, restart, recreate, with integrity comparison after every operation) is
exactly what the T016 harness verifies at T022 — ordinary operation needs only the sequences
above and a readiness check.

### 7.3 Operations this baseline does not provide

Deliberately absent, and not to be improvised as "maintenance":

- **No reset, recreate, or delete tooling for persistent state.** No `podman volume rm`, no
  `podman volume prune`, no `podman system prune`, no manual `initdb`, no store wipe. A refused
  start names its prerequisite; resolving it is investigation (§5, §6, §8), never deletion.
  Reinitializing persistent stores is exclusively the explicit, humanly-authorized decision
  described for interrupted-provisioning states (§5.1, S2–S4). The one tool that replaces the
  stores' content is the Recovery Set's restore (§7.6): it runs only while the application is
  stopped, only from a set of this runtime taken while it served the same image, and only after
  the Operator types `yes` for the database and again for the media. It keeps the volumes, the
  cluster, the roles and the media store's marker.
- **No automatic repair.** Neither unit repairs, grants, initializes, or provisions anything.
- **No broad cleanup procedures.** This document intentionally documents none; ordinary
  lifecycle creates no residue to clean (the media probe removes its own file with a no-residue
  proof).
- **No editing of committed units on the host** (§4.1) and **no marker creation to legitimize a
  missing/replaced store** (§5.3).
- **No second production stack** — no Docker/Compose or Kubernetes variant is maintained.

### 7.4 Content model updates

EmDash applies `seed/seed.json` only when it sets up a fresh database. A database set up from an
earlier seed gets a later content model from the model-update step, `scripts/model-update.mjs`
(`10` §4). A fresh database needs it too, before any content: setup leaves the seed's taxonomy
terms out unless it installs sample content, and keeps the core Categories and Tags. On the
rehearsal machine the check found 10 changes pending, and the first entry written was refused with
`400 VALIDATION_ERROR` until the step ran (#458). The step uses only EmDash's native schema,
taxonomy and menu APIs:

1. Take a Recovery Set of the database and its media (`10` §18; §7.6): stop the application,
   back up, and start it again before step 2, which needs it serving. A fresh database with no
   content has nothing to back up, and starts at step 2.
2. Use a checkout at the deployed commit, the Node its `package.json` engines pins, and an API
   token of an Administrator with the `schema:read`, `schema:write`, `content:read`,
   `taxonomies:manage` and `menus:manage` scopes (emdash 1.1.0 `src/astro/middleware/auth.ts`).
   Check what is pending, then apply it:

   ```bash
   node scripts/model-update.mjs --origin <public origin> --check < <token file>  # 0: nothing pending, 3: changes pending
   node scripts/model-update.mjs --origin <public origin> < <token file>
   ```

   The token goes in on standard input and is never printed. A problem, such as a URL pattern
   that differs from the seed's, changes nothing and needs a Product Owner decision.
3. Verify the public and Admin paths.

The development runtime runs the same step through `scripts/dev-runtime-model-update.sh`
(`development-quadlet.md`).

### 7.5 Admin change log

The application writes one JSON line to standard output for each state-changing request that an
EmDash API route answers: publishing, schema, menu and settings changes, user access and sign-ins
(#115, ADR 0005). Routine editing writes none, because EmDash records it itself or it changes
nothing: entry saves, the edit lock, new media uploads and the toolbar's token renewal, which a
public page sends every four minutes while a signed-in staff member keeps it open (#164). A
request to an API path that no route answers changes nothing and writes none either. A line looks
like this:

```json
{"log":"songhealth-admin-change","time":"2026-11-01T03:04:05.678Z","userId":"01J…","role":"EDITOR","method":"POST","path":"/_emdash/api/content/news/01J…/publish","status":200}
```

- `time` is UTC. `userId` and `role` are EmDash's, or `null` when no one was signed in; Admin →
  Users shows who a user id is. `role` is EmDash's role name, such as `ADMIN` or `EDITOR`.
- `status` shows whether the request succeeded or was refused, such as 401, 403 or 409.
- A line never holds a request body, query string, header, cookie, token or password. It says who
  made a change and when; the entry, field, menu or user named in `path` holds the new state.
- A scheduled publish goes live inside the application with no request: the line shows who
  scheduled it, and the entry shows when it went live.

The application unit sets no `LogDriver=`, so Podman sends the container's output to journald,
its default (Podman 5.8.4 `podman info` on the development host reports `journald`, and the
development runtime's application container uses it, 2026-11-01). Read the lines from the unit's
journal by their marker:

```bash
journalctl --user -u songhealth-app.service -o cat --grep songhealth-admin-change --since today
journalctl --user -u songhealth-app.service -o cat --grep 'songhealth-admin-change.*/admin/users/'
```

How long journald keeps them is set with the production host (Feature 001 T022/T028), where the
Product Owner confirms whether a legal minimum applies (ADR 0005).

### 7.6 Backup and restore: the Recovery Set

A Recovery Set (`GLOSSARY.md`) is the whole database and every media file, taken while the
application is stopped, with a manifest of what both held; it holds no runtime secret, which
`runtime-secret-recovery.md` recovers on its own path. `10` §18 asks for one before a risky schema
change, a bulk import or a major upgrade: the content-model update (§7.4) and the WordPress import
(`wordpress-cutover.md` "Before cutover" step 10) are both. Run the command from a checkout at the
deployed commit, on the Node `package.json` pins (26.13.0), as the deployment's user (#221):

```bash
SET=<an empty directory outside both volumes, mode 0700, such as ~/recovery-sets/<UTC time>>
systemctl --user stop songhealth-app.service       # the database stays up; nobody writes now
node scripts/recovery-set.ts backup production "$SET"
systemctl --user start songhealth-app.service
```

The backup refuses while `songhealth-app.service` runs and prints these two `systemctl` commands.
It writes three owner-only files and never overwrites one: `database.dump`, a complete
custom-format `pg_dump` made inside `systemd-songhealth-db` as the bootstrap administrator over its
local socket; `media.tar`, a ustar archive of the `songhealth-media` volume made under
`podman unshare`, without the `.songhealth-media-store` marker; and `manifest.json`, written last.
The manifest records the runtime, the image `songhealth-app.container` pins, the UTC time, the
`pg_dump`, server and EmDash versions, both archives' sizes and SHA-256, every table's row count
and the SHA-256 of its rows in primary-key order, EmDash's applied migrations, and every media
file's path, size and SHA-256. It prints the totals and the three files' SHA-256 for the
Operator's record. Then copy the set off the host over a private channel, since a set on the host
dies with the host; keeping several sets and a schedule are not part of this baseline.

The database's name and its administrator's come from the database container's own
`POSTGRES_DB` and `POSTGRES_USER` (`songhealth-db.env`), and the application role from the
`PGUSER=` line of `songhealth-app.env`, read by `grep` so that the command never holds
`PGPASSWORD`. No credential is asked for, printed or stored.

```bash
systemctl --user stop songhealth-app.service
node scripts/recovery-set.ts restore production "$SET"    # asks for "yes" twice
systemctl --user start songhealth-app.service
```

The restore admits the whole set before it changes anything: its three files and no other, the
manifest's grammar, a set of `production`'s taken while it served the image it serves now (point
the unit back at the set's image first, §4.5), both archives' sizes and SHA-256, a dump
`pg_restore --list` reads, and a media archive holding plain files and directories only, exactly
the manifest's. It refuses while the application runs, and asks for a typed `yes` for the database
and again for the media. Then it drops and recreates the `public` schema owned by the application
role, restores the dump as that role (`pg_restore --no-owner --no-privileges --exit-on-error
--single-transaction`), empties the media volume but for its marker, extracts the archive, and
runs the integrity check: every table's row count and digest, the migrations and every media file
against the manifest. A difference names its table or file path, never a row's content. A refusal
exits 1 with nothing changed; a failure after the reset began exits 3, says the runtime is
partial, and names the set to restore from again: keep the application stopped until a restore
passes. The restore works the same on a database that Quadlet has just created and §5 has just
provisioned, with the marker in place, which is how T028 drills a recreated runtime.

`node scripts/recovery-set.ts check production "$SET"` runs the integrity check on its own; while
the application runs, the tables it writes differ.

### 7.7 Cutting a Release

A Release (`GLOSSARY.md`) is an image built on the workstation from a commit, identified by its
version, that commit and its digest, and moved to the host as an archive (spec #450 "Releases").
Versions follow SemVer: `1.0.0` is a Release, and a version with a pre-release part, such as
`1.0.0-rc.1`, is a release candidate for the rehearsal. **Cutting a Release deploys nothing and
needs no approval.** The Operator's approval sits before a deployment, after the pin below has been
reviewed, and every deployment needs its own; a version is not that approval, and it is not
go-live.

**Before a cut**, the build commit passes the repository's checks as they exist:

| Check | How | Where it runs |
|---|---|---|
| Types and `astro check` | `npm run typecheck` | CI and the workstation |
| The build check | `npm run build:check` | CI and the workstation |
| The node tests | `npm run test:node` | CI and the workstation |
| The lifecycle harness's self-test | `tests/operations/verify-foundation.sh --self-test` | CI |
| Formatting | `npm run format:check` | CI and the workstation |
| Knip | `npm run knip` | CI and the workstation |
| jscpd | `npm run jscpd` | CI and the workstation |
| The shell lint | `npm run lint:shell` | CI and the workstation |
| The browser suites the change calls for | `node scripts/suites-for-change.ts <base>` lists them; they run against the development runtime (`README.md`) | the workstation |
| CI | `.github/workflows/checks.yml`, on every push to `main` and to an integration branch | GitHub |

The repository has no ESLint. That is a recorded gap in the Product Owner's quality baseline,
followed up in #471, not a check a Release passes.

**The cut.** From a clean checkout, on the Node `package.json` pins (26.13.0), with `gh` signed in
and the development runtime running (the image check uses its network and database):

```bash
node scripts/release.ts cut 1.0.0-rc.1 --sha <commit>     # or no --sha: the checkout's HEAD
```

It refuses a checkout with uncommitted changes, a commit whose GitHub check runs have not all
passed, and a version that already has a record, a tag or an image. A Release (no pre-release part)
also needs `package.json` to read its version at the commit, and the commit to be on `origin/main`
(Product Owner, #455 comment 7163433918). Then, in order, each step stopping the cut on a failure:

1. builds `deploy/Containerfile` from a `git archive` of the commit as
   `localhost/songhealth-app:<version>`, with `--disable-compression=true` (§4.5) and the OCI
   labels `org.opencontainers.image.version` and `org.opencontainers.image.revision`;
2. runs the image check on that image,
   `scripts/production-image-check.sh --sha <commit> --image localhost/songhealth-app:<version>`
   (#453: the native pieces, the startup gate's build as the image's user, a run against the
   development database and a stop as the commit's unit stops it), which leaves the image in place;
3. checks that the image's `/app/package.json` and `/app/tests/operations/verify-startup.sh` equal
   the commit's byte for byte, which the lifecycle harness requires of the deployed checkout;
4. saves the image with `podman save --format oci-archive --uncompressed` as
   `songhealth-app-<version>.oci.tar`, beside its SHA-256 in `songhealth-app-<version>.oci.tar.sha256`
   (`sha256sum -c` reads it on the host);
5. loads the archive into an empty, temporary Podman store and checks that the image reads the same
   digest there, then removes that store;
6. checks that no image left the workstation's storage and that Feature 001's
   `localhost/songhealth-app:0.0.1@sha256:4cfccf41…` is still there;
7. writes `record.json`: the version, the build commit, the image, its digest, the archive's name,
   SHA-256 and size, the tag, the UTC time, and `deploymentConfigCommit`, null until the pin.

A Release's record names its tag, `v<version>`, and the cut makes that annotated tag on the build
commit before it writes the record, its message naming the record, the image and digest and the archive's checksum; push it
with `git push origin v<version>`. A release candidate gets a record and no tag. The files go to
`<releases>/<version>/`, where `<releases>` is `--releases`, or `$SONGHEALTH_RELEASES`, or
`~/.local/share/songhealth/releases`; keep that folder off the host as well (spec #450 "Recovery
Sets, every night").

The command removes no image. A cut that fails removes its folder and leaves its image, and names
it: remove that image by its name (`podman rmi localhost/songhealth-app:<version>`) before cutting
the version again, or cut the next version.

**The pin**, a second commit reviewed on its own, so that the image is never rebuilt because only
the pin changed:

```bash
node scripts/release.ts pin 1.0.0-rc.1      # rewrites songhealth-app.container's Image= line
# commit that line, with §4.5 naming the new image, alone; review and merge it
node scripts/release.ts pinned 1.0.0-rc.1 <the merged pin commit>
```

`pinned` checks that the commit is not the build commit, descends from it and is on `origin/main`
or an integration branch (its review merged it), that its unit pins the record's image and digest, and that its `package.json` and
startup script are the build commit's; then it adds the commit to the record as
`deploymentConfigCommit`. The build commit and the pin commit stay apart in the record.

### 7.8 Running the lifecycle harness on a host (T022)

T022 is the T016 harness,
[`tests/operations/verify-foundation.sh`](../../tests/operations/verify-foundation.sh), run on the
Production host on the validation state, before any real content (spec #450 "T022,
T028 and the validation fixture"); its evidence goes to
`specs/001-platform-foundation/evidence/T022-us2-production-durability.md` (#467). The same run on
the rehearsal machine is a rehearsal and writes no T022 evidence: its record is
[`docs/evidence/459-t022-rehearsal.md`](../evidence/459-t022-rehearsal.md) (#459), and the steps
below are the ones run there.

**What the Operator prepares.**

1. **Two API tokens**, made by an Administrator on the Admin's API Tokens page
   (`/_emdash/admin/settings/api-tokens`), each with the shortest expiry the page offers, "7
   days", and revoked there after the run:
   - *the validation setup token*: "Settings Manage" (`settings:manage`) and "Media Write"
     (`media:write`), to set the tagline and upload the picture;
   - *the harness token*: "Settings Read" (`settings:read`) alone. The harness reads the tagline
     with it; it cannot write (a `POST` with it answers 403).

   The page's scopes and expiries were read in EmDash's Admin (`docs/agents/emdash-1.1.0.md`,
   "Native API for tests"); the page itself was not used, since the rehearsal made the same two
   tokens through the API with an Administrator's token.

   The Operator writes each value into its own file on the host, as the Deployment account, with
   `umask 077` (for example `~/.config/songhealth-t016/setup-token` and `harness-token`, mode
   0600), never into a chat, a command line or evidence, and removes both files after the run.
2. **The window.** Both units are stopped, started, restarted and recreated three times, and the
   application is refused once on purpose without its media volume, so the site does not answer
   for most of the run: on the rehearsal machine the application served no request for
   301.0 s of the 323.3 s run, at most 31.8 s at a time. Nobody may rely on
   the site during the run; the proxy has no page of its own for it before #460's notice.
3. **The checkout**: a git checkout at the Release record's `buildCommit` (§7.7) in the account's
   home, made from a bundle Claude Code copies over SSH, so that the host needs no access to
   GitHub (`git bundle create <file> <branch>` on the workstation; on the host
   `git clone --no-checkout <file> <dir>` and `git -C <dir> checkout --detach <buildCommit>`).
   The transcript's last lines name its commit by `git rev-parse HEAD`; a tree without `.git`
   reads "unknown". The harness binds that checkout to the running image by
   `tests/operations/verify-startup.sh` and `package.json`, which must be byte-equal to the
   image's (§7.7, step 3).

**The validation state**, set through the setup token, as the account on the host (the token
reaches `curl` through a file descriptor, never its command line):

```bash
auth() { printf 'Authorization: Bearer %s\n' "$(cat ~/.config/songhealth-t016/"$1")"; }
curl -sS -H @<(auth setup-token) -H 'Content-Type: application/json' -X POST \
  --data '{"tagline":"Songhealth Feature 001 foundation validation"}' \
  http://127.0.0.1:4321/_emdash/api/settings
curl -sS -H @<(auth setup-token) \
  -F 'file=@<checkout>/tests/operations/fixtures/validation-picture.png;type=image/png' \
  http://127.0.0.1:4321/_emdash/api/media      # data.item.url is the picture's path
```

The picture is the committed fixture, unchanged (SHA-256 `2c7b5116…f396`, #454); its
`/_emdash/api/media/file/<key>` is the harness's media path. Read the tagline back with the
harness token and compare it with T015's value and SHA-256 `84753035…4415` before the run.

**The inputs**, in the environment of the shell that runs the harness:

| Input | Value |
|---|---|
| `PATH` | Node first, `~/.local/opt/node-v<version>-linux-x64/bin` (§4.7 step 2): the harness needs `node`, `podman`, `systemctl`, `journalctl`, `sha256sum`, `timeout` and `mktemp` |
| `XDG_RUNTIME_DIR` | `/run/user/<the account's UID>`, for `systemctl --user` over SSH |
| `SONGHEALTH_APP_ORIGIN` | `http://127.0.0.1:4321`, the application's loopback publication |
| `SONGHEALTH_VALIDATION_TOKEN` | the harness token, read from its file into the variable inside the shell (`SONGHEALTH_VALIDATION_TOKEN=$(cat …)`), never typed on a command line |
| `SONGHEALTH_VALIDATION_MEDIA_PATH` | `/_emdash/api/media/file/<key>` of the uploaded picture |
| `SONGHEALTH_APP_IMAGE` | `localhost/songhealth-app:<version>`, without the digest: the harness reads the pin from the unit's `Image=` line and requires the running image to carry this tag |

Both units are active before the run. The run takes some minutes and must outlive the SSH
session, so it runs as a transient user unit, its output kept in a file:

```bash
systemd-run --user --unit=t016-run --collect bash <script that sets the inputs above, then runs>
#   cd <checkout> && bash tests/operations/verify-foundation.sh > <transcript> 2>&1
```

It passes with exit 0 and every stage's `PASS` (P0, R1, C1–C4, the baseline, three cycles, C7 and
C8). Its `--self-test` does not run on the host: the host has `node` alone (§4.7 step 2), and the
self-test's npm case needs an npm. It runs on the workstation and in CI at the build commit
(Product Owner, #459 comment 7213181563).

**Seen on the rehearsal machine, and expected on Ubuntu** (#459):

- `songhealth-db.service` ends each stop `failed`, result `exit-code`: the database is the last
  container on the rootless network, and its `ExecStop`'s `podman rm` exits 125 on
  `rootless netns: kill network process: permission denied`, AppArmor's `pasta` denial (§4.7,
  "Where Ubuntu differs"). The next start leaves it `active`, result `success`.
- At each cycle's restart step the application unit logs `Failed with result 'signal'` once: the
  database's restart restarts the application through its dependency, and the harness's own
  restart of the application then replaces that start job, which systemd ends with SIGTERM. The
  restart that follows completes.
- In the missing-volume case the application's start fails on purpose (`Failed to start …`),
  which is the case's STARTUP REFUSAL evidence (§8.4).

**After the run**: revoke both tokens on the API Tokens page and remove their files. The validation
tagline and picture stay for T028 (§7.6; #469 on the Production host, #461 on the rehearsal
machine) and are removed after it (#470).

## 8. Readiness interpretation

### 8.1 What each observable signal proves — and does not

| Observable | Proves | Does **not** prove |
|---|---|---|
| Public SSR page at the proxy origin (`GET /` serves the marker `<meta name="songhealth-foundation" content="public-runtime">`) | the application serves its minimum public verification behavior | any operational readiness — the SSR page can render while the database or media dependency is broken |
| `songhealth-db.service` active (`pg_isready` health + `Notify=healthy`) | the final PostgreSQL server accepts connections | completed provisioning (the intended database/user identity), nor application readiness |
| Completed Phase A with final-server identity verification (§5.1) | the intended database and bootstrap identity exist | that the application role is provisioned, or that the platform is ready |
| Application-role/schema prerequisites + T013 gate passed (journal `[S1..S6] PASS`) | database/migration compatibility and media writeability for this exact build | that the platform is *still* ready later — these gates run at startup |
| `songhealth-app.service` active (`Notify=healthy`) | the startup gates passed and the aggregate readiness helper passed when the startup notification fired | continued readiness — dependencies can fail later |
| Container health status / on-demand readiness helper (§8.2) | the current aggregate ready/not-ready state across runtime, database, and media-mount dependencies | migration state (startup-only evidence) — and it deliberately never mutates anything |
| Skipped unit (`ExecCondition`, §8.3) | a required input or store prerequisite failed; no container was created | a crash or failed exit — the start job completed normally |
| STARTUP REFUSAL naming media (§8.4) | the current start attempt refused because the persistent media attachment is absent | a readiness-helper result; restoration and full re-verification remain mandatory |

### 8.2 Recurring readiness is private and non-mutating

The recurring readiness mechanism is the accepted T012 helper
([`scripts/verify-readiness.mjs`](../../scripts/verify-readiness.mjs)), wired verbatim as the
application container's health command (`HealthCmd`, 10 s interval, 15 s timeout, 3 retries,
300 s start period; the helper self-terminates within its own 8 s bound) and callable on demand:

```bash
podman exec systemd-songhealth-app node scripts/verify-readiness.mjs
podman healthcheck run systemd-songhealth-app
podman inspect --format '{{.State.Health.Status}}' systemd-songhealth-app   # last status only
```

It runs inside the container — a private boundary with **no public endpoint** — consumes only
the container's configured environment, and checks, each within its own bound: the loopback `/`
SSR marker, bounded PostgreSQL connectivity through the `PG*` inputs, and `./media`
presence/readability. It prints only a `ready`/`not-ready` token, an ISO-8601 timestamp, and at
most a safe field or dependency name, exiting 0 only when ready. It **never mutates anything**:
no migration status/apply/check and no media write — those are the startup-only gates of §6.2 —
and it never creates a missing media mount. A `not-ready` result names the failed dependency
(database, media, runtime) or missing field; fix the cause, never the output. (The `--format`
inspection above is safe; unformatted `podman inspect` includes the container `Env` and can
disclose `PGPASSWORD` — §4.3.)

### 8.3 Skipped units — `ExecCondition` refusal semantics

When a required input is missing/empty, `PORT` disagrees with the committed publication, or the
existing-store guard refuses the persistent store, the unit's `ExecCondition` exits in the
1–254 range: systemd treats the unit as **skipped, not failed** — the start job completes
normally (`JOB_DONE`), the unit stays inactive with `Result=exec-condition`, and it is not
restarted. No container is created, the native image entrypoint never runs, no secret is read,
and the healthy notification cannot fire. The observables are the inactive state, the result
property, and the journal diagnostic:

```bash
systemctl --user status songhealth-db.service
systemctl --user show songhealth-db.service -p Result
journalctl --user -u songhealth-db.service -e
```

Diagnostics name the field, condition, or failed store classification only — never values or
credentials. A skipped database unit does not by itself reject the application unit's start job
(§4.2); the application-side prerequisites and gate are the fail-closed boundary there. Unit
inactivity, application startup refusal, and healthy/ready acceptance are three distinct
notions — do not collapse them when reading a partially-started deployment.

### 8.4 STARTUP REFUSAL (missing media attachment)

When the application container cannot start because the required persistent media attachment is
absent — so the readiness helper cannot execute at all — the invocation-scoped,
media-specific **startup refusal** emitted by the application unit's first startup step
(`… required persistent media volume songhealth-media is not attached at /app/media … refusing
to start`) is the accepted operational **not-ready** evidence class for that scenario. It is a
refusal record in the journal of the current attempted start, **never** reported as a
readiness-helper result. Its limits are part of the contract: it is valid only for the current
start attempt with the attachment omission verified from the generated unit's actual execution
definition; generic failures, stale logs, and simple unreachability do not qualify; the
application never reached healthy/ready; the original media volume must remain intact; and
restoring the attachment plus subsequent startup/readiness/data/media integrity verification all
remain mandatory. (A genuine helper `not-ready` result naming media from a running container
remains the other accepted evidence class.)

## 9. Private database boundary

PostgreSQL publishes **no host port in any form** — no `PublishPort`, `ExposeHostPort`, or other
host binding exists in the database unit, not even on loopback. It is reachable only as
`systemd-songhealth-db` on the private `songhealth` network, by the application (and by
operator `podman exec` into the containers). The application port is the sole publication in the
whole deployment, and its host side binds `127.0.0.1` only. Confirm the boundary when auditing:

```bash
podman port systemd-songhealth-db                 # expected: no output (nothing published)
podman container inspect --format '{{.HostConfig.PortBindings}}' systemd-songhealth-db   # expected: empty map
```

(Again: prefer `--format` extraction — unformatted `podman inspect` of the application container
carries `PGPASSWORD` in its `Env`.) The T016 harness additionally proves the boundary from the
host side by an actual refused TCP connect to the database container's private address — runtime
evidence that belongs to T022 (§11). There is no public health/readiness endpoint anywhere in
this deployment: readiness is private (§8.2) by Product decision.

## 10. External HTTPS / reverse-proxy boundary

The deployment publishes the application on `127.0.0.1:4321` and nothing else; everything beyond
that is the **external HTTPS/reverse-proxy boundary**, which Feature 001 explicitly does not
select a product for. Feature 016 places Caddy there, at the host's level, with Songhealth's own
site configuration (`10` §3.1 item 8; [`production-host-contract.md`](production-host-contract.md)
item 1). The proxy's responsibilities at this boundary:

- terminate **HTTPS** on the public origin and forward to the application's loopback publication
  (`127.0.0.1:4321`) on the same host;
- preserve/set the forwarding headers the platform relies on, apply its request limits, and
  maintain the security boundary (the proxy is the only intended public entry point; the
  database and all operational surfaces are private);
- serve the public origin that `EMDASH_SITE_URL` must exactly equal (absolute HTTPS origin,
  matching the proxy boundary).

Songhealth's site configuration, [`deploy/caddy/songhealth.caddy`](../../deploy/caddy/songhealth.caddy),
closes #218's two findings (#458; rehearsal evidence on #218, and the Production host's record is
#466's):

- **The name.** The site answers `songhealth.moph.go.th` alone and passes that name to the
  application as a fixed `Host`, so a server-side request is never built from a name a client sent.
  The host closes every other name (`production-host-contract.md` item 1).
- **`/_image`.** Production pages never ask for a rendition (ADR 0003), and the endpoint would make
  one at any size a request names, or fetch what the request points at. The proxy refuses it with
  403, in every spelling Astro routes to it. The one exception is a thumbnail the Admin asks for,
  whose `href` is one of the site's own media files: it is redirected to that original file, so no
  rendition is made and every Admin thumbnail shows the original (Product Owner, #458 comment
  7209607314). The gallery picker's selection tray has no fallback of its own, and showed broken
  thumbnails under a plain refusal.
- **The request body.** At most 51 MiB: the Admin's largest upload, 50 MiB (EmDash 1.1.0's default
  `maxUploadSize`, which `astro.config.mjs` keeps), with 1 MiB for a multipart form's framing. A
  larger body is refused with 413 and EmDash's own error shape, code `REQUEST_BODY_TOO_LARGE`,
  before it reaches the application. Under the limit, EmDash's own limits answer.
- **The order.** The private-network snippet runs first, so a source outside the allowed network
  gets no answer of any kind, a redirect or a 413 included.

The deployed-stack check reads all of it from outside, through the proxy at the site's real name,
on the rehearsal machine and on the Production host alike:

```bash
node scripts/stack-check.ts --inside <address on the private network> \
  --outside <address a source outside it reaches> [--ca <the authority's certificate, when not public>] \
  [--other-site <another system's site on the same proxy>]
```

It prints one PASS or FAIL line a check and no address, sends no request body, and exits 1 when
any check fails. Its outside checks (P1–P3) read the access before the cutover (spec #450): once
the host lets every source reach the site, they no longer apply. The `Host` the application
receives cannot be read from outside, since no page repeats it; the check reads that every other
name is closed (H1, H2) and that the site's name in another spelling still reaches the site (H3),
and the rehearsal machine's loopback showed the fixed name on every request that reached the
application (#458). On the rehearsal machine `--outside` is the workstation's loopback forward
(`scripts/rehearsal/vm.sh`), `--ca` the Internal Test CA's certificate and `--other-site` the
stand-in's `other-system.invalid`. The pictures themselves, in the Admin and on the public pages
at phone and desktop widths, are read by `scripts/rehearsal-pictures.ts` on the rehearsal machine
only.

Native Admin and passkey availability: the CMS administration capability is the native EmDash
Admin at `/_emdash/admin/` on the same application — no separate admin surface is deployed. The
one-time first-admin setup uses native passkey authentication, and passkeys are origin-bound
(WebAuthn ceremonies bind to the site origin), so production Admin setup and sign-in require the
external HTTPS origin to be live and correct in `EMDASH_SITE_URL`. Routine operational checking
never automates passkey login; the native sign-in/setup response is the accepted availability
signal.

No monitoring product is selected or required by this baseline: the observable operational
surface is user systemd and the containers themselves — unit state and results, the journal
(startup-gate verdicts, refusal diagnostics), container health, and the on-demand readiness
helper (§8). Feature 016 adds no monitoring stack: Songhealth's own watch reads these and
reports through the host's alert command, and the host watches the machine (`10` §17;
[`production-host-contract.md`](production-host-contract.md) items 4 and 5).

## 11. Runtime evidence status and deferred work

What is accepted **now** is the source-level deployment: T015 (US1) with full runtime evidence
on the development path, and independent static review PASS for T019 and T020 at this baseline.
What remains **pending runtime evidence**, under the separately authorized T022 task on a
production-capable verification host: executing the T016 harness — startup gates, private-network
access, no published PostgreSQL port, expected volume attachments, three lifecycle cycles,
missing-attachment not-ready behavior, and exact `tagline`/media persistence-integrity
comparison. The harness has run through once on the Ubuntu rehearsal machine (#459, §7.8): a
rehearsal, which writes no T022 evidence. Every runtime-shaped claim in this document (host `stat`
behavior, rootless port-forwarding behavior, actual startup durations vs the §6.3 ceiling,
isolation probes) is as-built design recorded in the units, not yet runtime-proven on the production host; T022
records the exact host versions alongside it. Runtime-secret recovery is
`runtime-secret-recovery.md` (T023), and the Recovery Set's backup and restore are §7.6 (#221,
which replaced T024–T027). The recovery drill, T028, runs them on the production host after T022
and is pending. This document claims no runtime acceptance and integrates nothing into the canonical
branch.

## Appendix A. T021 element traceability

| `tasks.md` T021 element | Section |
|---|---|
| rootless user-systemd installation | §4.1–§4.2, §4.6 |
| start/stop/restart/recreation | §7.1–§7.2 |
| private database boundary | §2, §9 |
| persistent volume handling | §4.5, §5, §6.1, §7.2 |
| readiness interpretation | §6.3, §8 |
| external HTTPS/reverse-proxy boundary without selecting a proxy product | §10 |

## Appendix B. Verified external documentation sources

Version-sensitive facts in this document were verified against current upstream documentation
(first via Context7, per the repository rules, now in
[`CLAUDE.md`](../../CLAUDE.md)), on 2026-10-11:

- **Podman / Quadlet** (docs.podman.io; the T001 evidence additionally verified the same
  capabilities against the versioned v6.1.3 release-tag man pages): rootless user-unit search
  paths including `~/.config/containers/systemd/` and the `daemon-reload` requirement after
  installing or changing Quadlet files (`podman-systemd.unit(5)`); generated service naming —
  `<name>.service` for `.container`, `<name>-network.service` for `.network`,
  `<name>-volume.service` for `.volume`, with the default `systemd-` prefixed container and
  volume names overridable by `ContainerName=`/`VolumeName=` (`podman-systemd.unit(5)`,
  `podman-volume.unit(5)`); `Notify=healthy` postponing the startup notification until the
  health check passes; generated services being transient with the generator applying the
  source `[Install]` section at generation time, and Quadlet drop-in files in
  `<name>.container.d/*.conf` (`podman-systemd.unit(5)`); the generated container service
  running `podman run … --replace --rm` and stopping with `podman rm -v -f -i <container>`
  plus an ignored-failure `ExecStopPost` repeat (v6.1.3 generator source,
  `pkg/systemd/quadlet/quadlet.go` — the basis of §7.2's native stop/start recreation).
- **systemd** (project documentation and source, via Context7): per-user manager lifetime —
  `user@.service` runs while a login session is open and terminates after the last logout
  unless lingering is enabled, in which case it starts at boot and survives logout
  (`systemd-run(1)`, logind); `ExecCondition` exit status 1–254 producing skip semantics —
  skipped, not failed, not restarted (`systemd.service(5)`; `src/core/service.c`
  `SERVICE_SKIP_CONDITION`); `EnvironmentFile` parsing — comments only as full lines starting
  with `#`/`;`, no inline comments; unquoted values run to end of line with surrounding
  whitespace trimmed and **every backslash escaping (and being consumed by) the following
  character**; double quotes preserve whitespace and escape only `\`, `"`, `` ` ``, `$`; single
  quotes are fully literal (`systemd.exec(5)`; the `parse_env_file` implementation and its
  parser tests, checked at v259 — the basis of §4.3's environment-file rules).

Upstream documentation explains what the technology does; the Product authorities and the
committed deployment units above remain the authority for what this deployment does.

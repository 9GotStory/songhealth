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
recovery work (T023–T028) is later. See §11.

## 1. Scope, authority, and verification status

In scope here: installation, one-time provisioning, startup, start/stop/restart/recreation,
readiness interpretation, the private database boundary, and the external HTTPS/reverse-proxy
boundary of the Feature 001 production baseline.

Out of scope, unchanged: selecting a reverse-proxy or monitoring product (Feature 001 explicitly
excludes both; §10 states the required boundary only), backup/recovery procedures (later tasks —
see §11), any second production stack (Docker/Compose and Kubernetes are not baselines), and any
boot-time or scheduling policy the committed units do not define (§4.6).

## 2. Production topology

```text
Internet
  -> external HTTPS/reverse-proxy boundary (product not selected; §10)
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
- **GNU coreutils `/usr/bin/stat`** at that absolute path: the database unit's existing-store
  guard relies on its exact output contract (§6.1). Its availability, version, and behavior on
  the target host are **mandatory pre-adoption runtime evidence** — verify and record them
  before adopting a host (T022 records them; they are unverified until then).
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
independently protected recovery copy of every required runtime secret (the recovery procedure
itself is later work — §11).

**Identity matching.** The migration URL inside `songhealth-migration-database-url` must
identify the **same intended database** as the `PG*` inputs — same host (`systemd-songhealth-db`),
port (`5432`), database (`PGDATABASE`), and user (`PGUSER`). Agreement is enforced by the
startup gate (S1) by comparing the non-secret identity components only, and re-proved in S3
against the native inspected target label; the password and full URL are never printed. A
disagreement skips/blocks startup naming the mismatching field only.

### 4.5 Application image identity and availability

Every production image is pinned by explicit version **and** immutable digest:

- Application: `localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407`
- PostgreSQL: `docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf`
- The application image's build base is itself digest-pinned inside the Containerfile
  (official Node 24.21.0 image).

Podman resolves the digest against local image storage, so any other or rebuilt image fails
container creation closed. Two consequences for operators:

1. **The accepted application artifact must be present** in the deployment user's rootless
   Podman storage (inspectable as `localhost/songhealth-app@sha256:4cfccf41…`). A fresh
   `podman build -f deploy/Containerfile …` does **not** satisfy the pinned identity: default
   image builds are not bit-reproducible across build times, so a rebuilt image has a different
   digest by construction. Never rebuild onto a deployment host expecting it to match.
   - **Where the artifact is.** As of 2026-10-29 (Feature 002 T037) the accepted artifact is
     held in the rootless Podman storage of `thanakorn` (UID 1000). Its build account, UID 1001,
     was retired.
   - **Moving it.** Move it between accounts or hosts with
     `podman save --format oci-archive --uncompressed` and `podman load`, which keep the
     manifest digest. The default `oci-archive`, `docker-archive` and `docker-dir` formats
     rewrite the manifest and change the digest.
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

Provisioning commands and their evidence are disposable operator material and are intentionally
not committed. The application unit enforces this end state itself **before every start**, before
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
  described for interrupted-provisioning states (§5.1, S2–S4).
- **No automatic repair.** Neither unit repairs, grants, initializes, or provisions anything.
- **No broad cleanup procedures.** This document intentionally documents none; ordinary
  lifecycle creates no residue to clean (the media probe removes its own file with a no-residue
  proof).
- **No editing of committed units on the host** (§4.1) and **no marker creation to legitimize a
  missing/replaced store** (§5.3).
- **No second production stack** — no Docker/Compose or Kubernetes variant is maintained.

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
select a product for. The proxy's responsibilities at this boundary:

- terminate **HTTPS** on the public origin and forward to the application's loopback publication
  (`127.0.0.1:4321`) on the same host;
- preserve/set the forwarding headers the platform relies on, apply its request limits, and
  maintain the security boundary (the proxy is the only intended public entry point; the
  database and all operational surfaces are private);
- serve the public origin that `EMDASH_SITE_URL` must exactly equal (absolute HTTPS origin,
  matching the proxy boundary).

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
helper (§8). Selecting a monitoring stack remains a later, separately authorized decision.

## 11. Runtime evidence status and deferred work

What is accepted **now** is the source-level deployment: T015 (US1) with full runtime evidence
on the development path, and independent static review PASS for T019 and T020 at this baseline.
What remains **pending runtime evidence**, under the separately authorized T022 task on a
production-capable verification host: executing the T016 harness — startup gates, private-network
access, no published PostgreSQL port, expected volume attachments, three lifecycle cycles,
missing-attachment not-ready behavior, and exact `tagline`/media persistence-integrity
comparison. Every runtime-shaped claim in this document (host `stat` behavior, rootless
port-forwarding behavior, actual startup durations vs the §6.3 ceiling, isolation probes) is
as-built design recorded in the units, not yet runtime-proven on the production host; T022
records the exact host versions alongside it. Recovery work (runtime-secret recovery
documentation, backup/restore scripts, and the recovery drill — T023–T028) is later Feature 001
work and is intentionally not described here beyond the secret-recovery prerequisite noted in
§4.4. This document claims no runtime acceptance and integrates nothing into the canonical
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

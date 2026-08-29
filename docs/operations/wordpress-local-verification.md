# Disposable Local WordPress Verification Runtime — Operations Guide

Delivery 002 Gate 01.5 (Multica issue `9GOTSTORY-37`). Operated by
`scripts/wordpress-verification.sh` against `infra/compose.wordpress-verification.yaml`.

## What this is — and what it is not

This runtime is the **local-only, reproducible, disposable Podman verification
profile** required by the accepted Delivery 002 plan before `tasks.md` T006
begins (plan.md §Technical Context: "Reproducible local
WordPress/PHP/MySQL-compatible verification"; research.md §1). It provides:

- clean WordPress Core on PHP 8.3 with Apache (digest-pinned official image);
- a MySQL-compatible database (digest-pinned MySQL 8.4, the same provisional
  local engine choice already recorded by Delivery 001);
- the first-party `songhealth-core` plugin, bind-mounted **read-only from this
  checkout**, so the running plugin is always exactly the accepted T005
  repository source;
- bounded, categorized start/readiness/stop/restart/reset workflows.

**This runtime is not Production parity and authorizes nothing beyond local
verification.** It is not a Production, staging, or deployment baseline; it
locks no Production PHP, WordPress, database, or topology decision (those
remain gated on real Bangmod/DirectAdmin account evidence, SC-009); and it
does not authorize deployment, importer implementation, Trial Migration,
Production Import, Production Cutover, or legacy retirement (FR-002, FR-027,
FR-028). The image digests are implementation-time verification pins that
resolve to WordPress 7.1 / PHP 8.3.33, WP-CLI 2.12.0 / PHP 8.3.33, and MySQL
8.4; floating tags are never used.

Only synthetic data exists here. No Production data, no unsanitized
Production-derived data, no legacy Songhealth theme or plugin is ever loaded.
The only plugin ever activated is `songhealth-core`; the readiness proof fails
closed if any other plugin is active.

## Prerequisites

- Linux host with rootless **Podman 5.x** and a Compose provider
  (`podman-compose` or `docker-compose`; check with `podman compose version`).
- `curl` and `sha256sum`.
- ≈2 GB disk for the three images (pulled automatically on first start).
- A complete checkout of this repository (the plugin is mounted live from
  `wordpress/wp-content/plugins/songhealth-core`).
- SELinux note (Fedora and similar): the plugin and tool mounts use the
  shared `z` label option, which relabels the mounted tree to
  `container_file_t` so containers may read it. The relabel is reapplied at
  every start; if a *new* file appears in the plugin tree while the runtime is
  already running, restart (`stop` + `start`) once so the label is applied to
  it.

## Configuration

```bash
cp .env.wordpress-verification.example .env.wordpress-verification.local
# then set local values — replace every change-me password with a locally
# generated value; the local file is Git-ignored and never committed.
```

The example file is the committed safe representation of the required
configuration (FR-021): it contains no real credential and no Production
value. The local file supplies the loopback origin/port, the synthetic local
WordPress administrator, and this project's own database credentials.
`start`/`ready` fail closed with an actionable `[config]` message when any
required key is missing or empty, the site URL is not exactly
`http://127.0.0.1:<port>` (or `http://localhost:<port>`), or the port is
outside 1024–65535. `stop`, `status`, and `reset` deliberately do not require
the local file — teardown and cleanup must always stay available.

Nondisclosure: no command prints a configuration value. Child-process output
is only ever shown after a redaction filter that masks every locally
configured secret value and generic credential-shaped tokens.

## Workflows

All commands run from the repository root. Every failure exits non-zero,
is bounded by an explicit timeout, and prints one actionable `[category]`
line (exit codes: 2 usage · 3 podman · 4 config · 5 database · 6 WordPress
HTTP · 7 WordPress/plugin readiness · 8 resource guard).

### 1. Preflight (starts nothing)

```bash
scripts/wordpress-verification.sh preflight
```

Checks Podman, the Compose provider, the manifest, the plugin source, the
configuration, and port availability; reports whether the pinned images are
already local.

### 2. Start — the one-command workflow (first run and every later run)

```bash
scripts/wordpress-verification.sh start
```

Idempotently: brings the project up, waits (bounded) for the database to be
healthy and WordPress to answer on the loopback origin, then — first run
only — installs clean WordPress Core with the synthetic local administrator
and activates `songhealth-core`, and finally **proves** readiness:

- HTTP `200` on `/` and a JSON REST root (`200` + `application/json` at
  `/?rest_route=/`) at `WORDPRESS_VERIFY_SITE_URL` — a fresh clean install
  ships without pretty permalinks, so `/wp-json/` itself would only serve
  front-page HTML; the query-string REST route is the honest predicate;
- `READY wordpress=7.1 songhealth-core=0.1.0 active-plugins=songhealth-core` —
  core installed and bootable, the plugin **loaded in a full WordPress boot**
  (its version constant is defined), and the exact active-plugin set is
  `songhealth-core` alone.

On a routine re-run the profile is already initialized; the same proof runs
and nothing is reinstalled.

### 3. Verify readiness only

```bash
scripts/wordpress-verification.sh ready
```

The proof above without any state change. Fails `[preflight]` when the
runtime is not running.

### 4. Routine stop (state preserved)

```bash
scripts/wordpress-verification.sh stop
```

Stops both containers and leaves both named volumes intact:
`${PROJECT}_wordpress-db-data` (the runtime-owned database state) and
`${PROJECT}_wordpress-core` (Core files, generated `wp-config.php`, uploads).

### 5. Routine restart + persistence proof

```bash
scripts/wordpress-verification.sh restart
```

`stop` + `start`. To prove the routine lifecycle preserves the runtime-owned
database state, keep a synthetic marker in the database across the restart
(pass `wp` subcommands as plain arguments — no shell indirection, which the
Compose provider does not quote for you):

```bash
# marker before stop (inside the one-shot CLI service):
podman compose --file infra/compose.wordpress-verification.yaml \
  --project-name songhealth-wp-<checkout-hash> --profile tools \
  run --rm wordpress-cli wp option add songhealth_verify_marker synthetic-before-restart

scripts/wordpress-verification.sh restart

# marker still present afterwards:
podman compose --file infra/compose.wordpress-verification.yaml \
  --project-name songhealth-wp-<checkout-hash> --profile tools \
  run --rm wordpress-cli wp option get songhealth_verify_marker
```

(The `<checkout-hash>` is printed by `status`; the marker is synthetic
operational state, disposed with the profile — it is not Product behavior.)

### 6. Status

```bash
scripts/wordpress-verification.sh status
```

Lists this project's containers (with health), volumes, and network, and
verifies every one carries the `operation-target=wordpress-local-verification`
ownership label. No configuration values are shown.

### 7. Explicit disposable reset

```bash
scripts/wordpress-verification.sh reset --confirm-disposable-reset
```

Deliberate and scoped: it enumerates **only this checkout's** Compose project
resources, verifies each carries the `wordpress-local-verification` ownership
label (aborting without removing anything if any does not), then removes the
project's containers, **both volumes**, and its network, and verifies nothing
of the project remains. It cannot target Delivery 001 resources, any other
checkout's resources, or anything outside the project, and it touches nothing
on the host beyond Podman. After a reset, `start` performs a fresh clean
installation.

## Resource naming and isolation

| Resource | Name (deterministic per checkout) |
| --- | --- |
| Compose project | `songhealth-wp-<first 12 hex of sha256(checkout root)>` |
| Web container | `<project>_wordpress_1` |
| Database container | `<project>_wordpress-db_1` |
| Core volume | `<project>_wordpress-core` |
| Database volume | `<project>_wordpress-db-data` |
| Network | `<project>_wordpress` |

The checkout-scoped derivation mirrors the accepted Delivery 001 convention
(`scripts/foundation-operations.mjs`): the same checkout always reconciles the
same resources, and different checkouts never collide. The `songhealth-wp-`
prefix, the service/volume/network names, the credentials namespace, and the
ownership labels (`delivery=002-headless-wordpress-foundation`,
`operation-target=wordpress-local-verification`) are all distinct from
Delivery 001's `songhealth-dev-*` / `songhealth-verify-*` Development and
Verification resources, which are preserved untouched (FR-026).

Exposure defaults: exactly one port is published and it binds to `127.0.0.1`
only; the database has **no host publication at all** (`expose` only), so it
is unreachable off-host and outside the project network (FR-021/FR-022
posture; nothing binds database access broadly).

## Failure behavior

| Situation | Behavior |
| --- | --- |
| Podman or Compose provider missing/unusable | exit 3, `[podman]` message |
| Local config missing, incomplete, non-loopback URL, bad port, port busy | exit 4, `[config]` message naming the category — never the value |
| Database not healthy within 300 s | exit 5, `[database]` message with the container-logs command |
| WordPress not answering within 180 s | exit 6, `[wordpress]` message with the container-logs command |
| Core install/activation failing | exit 7, `[plugin]` message plus redacted child output |
| Readiness/plugin-loaded proof failing | exit 7, `[plugin]` message naming the failed predicate |
| Unexpected active plugin | initialization and readiness both fail closed |
| Reset finds an unlabeled project resource | exit 8, `[resource]` abort, nothing removed |

## Evidence capture for reviews

When recording verification evidence for this runtime (e.g. in a Multica
review thread), capture: the exact command, its exit code, and the summary
lines it printed. Per the Delivery 002 quickstart evidence rule, evidence must
omit secrets, cookies/nonces, credentials, CMS usernames, paths beyond the
committed example, and protected content — the workflow output above is
already shaped that way; never paste `.env.wordpress-verification.local`
values or container environment dumps.

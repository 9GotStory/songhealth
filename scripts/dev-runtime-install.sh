#!/usr/bin/env bash
# Songhealth development Quadlet runtime — INSTALLER (PO gate 6410811185).
# Phase 2 EXECUTOR: this script was NOT executed in Phase 1 (source-only) and
# must run only under the separately authorized Phase 2 provisioning gate.
# It provisions a FRESH, ISOLATED UID-1000 rootless runtime (names songhealth-qdev-*):
# it never touches the UID-1001 runtime at 127.0.0.1:4322, its controller, volumes,
# credentials, or any production resource, and it never deletes or resets anything.
set -Euo pipefail
IFS=$'\n\t'
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_CHECKOUT="$HOME/dev/songhealth-quadlet"
QUADLET_SRC="$REPO_ROOT/deploy/dev-quadlet"
UNIT_DIR="$HOME/.config/containers/systemd"
APP_PORT=4324
NAMES=(songhealth-qdev-app songhealth-qdev-db songhealth-qdev songhealth-qdev-db-data songhealth-qdev-media)
die() { echo "dev-runtime-install: FAIL: $*" >&2; exit 1; }
note() { echo "dev-runtime-install: $*"; }
confirm() { # confirm <prompt> — irreversible steps need a typed yes
  local reply; read -r -p "dev-runtime-install: $1 [type yes to continue]: " reply
  [[ "$reply" == "yes" ]] || die "operator did not confirm; stopping (nothing has been modified by this step)"
}
command -v podman >/dev/null || die "podman not found"
command -v systemctl >/dev/null || die "systemctl not found"
[[ "$(id -u)" -eq 1000 ]] || die "this installer provisions the UID-1000 development runtime only"
systemctl --user is-system-running >/dev/null 2>&1 || die "systemd user session is not available (log in via loginctl enable-linger first)"
# --- fail-closed preflight: refuse any pre-existing qdev resource or port conflict
for n in "${NAMES[@]}"; do
  podman container exists "$n"; rc=$?
  [[ $rc -eq 0 ]] && die "container $n already exists: this installer never adopts or resets existing resources"
  [[ $rc -eq 1 ]] || die "container existence check for $n failed (rc=$rc): an inspection error is never treated as absence"
  podman network exists "$n"; rc=$?
  [[ $rc -eq 0 ]] && die "network $n already exists"
  [[ $rc -eq 1 ]] || die "network existence check for $n failed (rc=$rc)"
  podman volume exists "$n"; rc=$?
  [[ $rc -eq 0 ]] && die "volume $n already exists"
  [[ $rc -eq 1 ]] || die "volume existence check for $n failed (rc=$rc)"
done
SS_OUT="$(ss -ltn)" || die "ss failed: port availability could not be observed"
grep -Eq "(^|[[:space:]])(\*|0\.0\.0\.0|127\.0\.0\.1|\[::\]):${APP_PORT}([[:space:]]|$)" <<<"$SS_OUT" \
  && die "port ${APP_PORT} is already occupied (including wildcard listeners): no fallback port is permitted"
for f in "$UNIT_DIR"/songhealth-dev.network "$UNIT_DIR"/songhealth-dev-db.container "$UNIT_DIR"/songhealth-dev-app.container \
         "$UNIT_DIR"/songhealth-dev-db-data.volume "$UNIT_DIR"/songhealth-dev-media.volume; do
  [[ -e "$f" ]] && die "user unit $f already exists: this installer never overwrites installed units"
done
grep -q . <(podman images --format '{{.Repository}}:{{.Tag}}' | grep -x 'docker.io/library/node:24.21.0') 2>/dev/null \
  || podman pull docker.io/library/node:24.21.0 >/dev/null || die "could not pull the pinned Node image"
NODE_DIGEST="$(podman image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' docker.io/library/node:24.21.0 | grep -oE 'sha256:[0-9a-f]{64}' | head -1)"
[[ -n "$NODE_DIGEST" ]] || die "could not resolve the Node image immutable digest: refusing to proceed without it"
note "Node image digest resolved BEFORE any start: $NODE_DIGEST (record this in the Phase 2 evidence; the unit stays tag-pinned, digest-enforced by this record)"
[[ -d "$SRC_CHECKOUT/.git" ]] || die "versioned source checkout missing at $SRC_CHECKOUT (clone the repository there first)"
( cd "$SRC_CHECKOUT" && git rev-parse --verify HEAD >/dev/null 2>&1 ) || die "$SRC_CHECKOUT is not a git checkout"
[[ -d "$SRC_CHECKOUT/node_modules/astro" ]] || die "pinned dependencies not installed in $SRC_CHECKOUT (run the documented npm ci step with the pinned Node first)"
SRC_SHA="$( cd "$SRC_CHECKOUT" && git rev-parse HEAD )"
note "source checkout: $SRC_CHECKOUT @ $SRC_SHA (this exact SHA is the runtime source identity)"
# --- environment files (0600; refuse overwrite) and podman secrets
ENV_DB="$UNIT_DIR/songhealth-dev-db.env"; ENV_APP="$UNIT_DIR/songhealth-dev-app.env"
for f in "$ENV_DB" "$ENV_APP"; do [[ -e "$f" ]] && die "$f already exists: refusing to overwrite existing credentials"; done
DB_PASS="$(openssl rand -hex 24)"; ENC_KEY="$(openssl rand -base64 32)"; MIG_PASS="$(openssl rand -hex 24)"
umask 077; mkdir -p "$UNIT_DIR"
printf 'POSTGRES_USER=songhealth_qdev_admin\nPOSTGRES_DB=songhealth_qdev\n' > "$ENV_DB"
APP_PW="$(openssl rand -hex 24)"
printf 'HOST=0.0.0.0\nPORT=4321\nPGHOST=songhealth-qdev-db\nPGPORT=5432\nPGDATABASE=songhealth_qdev\nPGUSER=songhealth_qdev_app\nPGPASSWORD=%s\nEMDASH_SITE_URL=http://127.0.0.1:4324\n' \
  "$APP_PW" > "$ENV_APP"
# NOTE: the generated PGPASSWORD must be provisioned as the app role password during
# the fresh-install database step below; the migration URL and encryption key become
# podman secrets. Values are never echoed, logged, or committed.
printf '%s' "postgres://songhealth_qdev_app:${APP_PW}@songhealth-qdev-db:5432/songhealth_qdev" \
  | podman secret create songhealth-qdev-migration-database-url - || die "could not create migration-url secret"
printf '%s' "$ENC_KEY" | podman secret create songhealth-qdev-encryption-key - || die "could not create encryption-key secret"
printf '%s' "$DB_PASS" | podman secret create songhealth-qdev-db-password - || die "could not create db-password secret"
note "store $ENV_DB/$ENV_APP and secret names in the operator password vault now; then record the app-role password from $ENV_APP"
# --- quadlet units (idempotent copy, explicit list, nothing else)
confirm "install Quadlet units into $UNIT_DIR and reload the user systemd manager?"
for f in songhealth-dev.network songhealth-dev-db-data.volume songhealth-dev-media.volume songhealth-dev-db.container songhealth-dev-app.container; do
  install -m 0644 "$QUADLET_SRC/$f" "$UNIT_DIR/$f" || die "install $f failed"
done
systemctl --user daemon-reload || die "daemon-reload failed"
# --- media store marker (operator-provisioned store; the app unit requires it)
podman volume create --label io.songhealth.runtime=qdev songhealth-qdev-media >/dev/null || die "media volume create failed"
podman volume create --label io.songhealth.runtime=qdev songhealth-qdev-db-data >/dev/null || die "db-data volume create failed (pre-labeled so quadlet adopts it and restore can verify ownership)"
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)"
[[ -n "$MP" ]] || die "media volume mountpoint not inspectable"
podman unshare touch "$MP/.songhealth-qdev-media-store" || die "could not provision the media store marker"
# --- fresh database cluster start + native initialization (least-privilege app role)
confirm "start songhealth-dev-db.service now (fresh empty cluster init on the new volume)?"
systemctl --user start songhealth-dev-db.service || die "db service start failed"
for _ in $(seq 1 60); do podman exec songhealth-qdev-db pg_isready -U songhealth_qdev_admin -d songhealth_qdev >/dev/null 2>&1 && break; sleep 2; done
podman exec songhealth-qdev-db pg_isready -U songhealth_qdev_admin -d songhealth_qdev >/dev/null 2>&1 || die "database did not become ready"
podman exec -i songhealth-qdev-db psql -U songhealth_qdev_admin -d songhealth_qdev -v ON_ERROR_STOP=1 -v app_pw="$APP_PW" <<'SQL' || die "app role creation failed"
CREATE ROLE songhealth_qdev_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE songhealth_qdev OWNER TO songhealth_qdev_app;
ALTER SCHEMA public OWNER TO songhealth_qdev_app;
SQL
# --- native EmDash migrations via the pinned in-container CLI (fresh DB only)
confirm "apply native EmDash migrations to the FRESH songhealth_qdev database now?"
( cd "$SRC_CHECKOUT" && podman run --rm --network songhealth-qdev -v "$SRC_CHECKOUT:/src:Z" -w /src \
    -e HOST=0.0.0.0 -e PORT=4321 -e EMDASH_SITE_URL=http://127.0.0.1:4324 \
    -e PGHOST=songhealth-qdev-db -e PGPORT=5432 -e PGDATABASE=songhealth_qdev -e PGUSER=songhealth_qdev_app -e PGPASSWORD="$APP_PW" \
    -e EMDASH_MIGRATION_DATABASE_URL="postgres://songhealth_qdev_app:${APP_PW}@songhealth-qdev-db:5432/songhealth_qdev" \
    -e EMDASH_ENCRYPTION_KEY="$ENC_KEY" \
    docker.io/library/node:24.21.0 node node_modules/emdash/dist/cli/index.mjs migrate --from-config --config astro.config.mjs ) \
  || die "native migration failed: STOPPING before app start (database remains initialized; rerun requires Phase 2 gate re-authorization)"
confirm "enable + start songhealth-dev-app.service now?"
systemctl --user enable --now songhealth-dev-app.service || die "app service enable/start failed"
note "installation sequence complete; run scripts/dev-runtime-verify.sh and record its output as Phase 2 evidence"

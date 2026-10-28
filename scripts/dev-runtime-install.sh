#!/usr/bin/env bash
# Songhealth development Quadlet runtime — INSTALLER (PO gate 6410811185).
# Phase 2 EXECUTOR: this script was NOT executed in Phase 1 (source-only) and
# must run only under the separately authorized Phase 2 provisioning gate.
# It provisions a FRESH, ISOLATED UID-1000 rootless runtime (names songhealth-qdev-*):
# it never touches the UID-1001 runtime at 127.0.0.1:4322, its controller, volumes,
# credentials, or any production resource, and it never deletes or resets anything.
# Phase 2A Corrective R1 (PO gate, issue #26 comment 6430777194; Codex design review
# APPROVED): secret values never appear in process arguments — the app-role password
# reaches psql only through the stdin script stream, and the migration runner reads
# podman-secret files mounted at /run/secrets (same pattern as the app unit start).
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
# F4 (Phase 2A Corrective R1): distinguish user-manager availability, manager state and
# linger persistence. Fail-closed strictness is UNCHANGED: only a user manager reporting
# 'running' (is-system-running exit 0) is accepted; 'degraded' or any other state refuses.
if ! SYSMGR_STATE="$(systemctl --user is-system-running 2>&1)"; then
  die "systemd user manager preflight failed: is-system-running -> '${SYSMGR_STATE}' (non-zero). A running user manager is required; 'degraded' or other states remain refused (fail-closed strictness unchanged). If no user manager exists at all, one is started by logging in (a user manager is per-account and exists only while logged in unless lingering is enabled). Linger controls persistence across logout/reboot only - it is NOT manager availability; the linger policy for this runtime is a separate Product Owner decision (docs/operations/development-quadlet.md)."
fi
# Non-gating linger observation (exact-match classification; query exit status is
# checked BEFORE any output is interpreted; any failure or unparseable result is UNKNOWN).
if _LINGER_RAW="$(loginctl show-user "$(id -un)" -p Linger 2>/dev/null)"; then
  case "$_LINGER_RAW" in
    Linger=yes) note "linger: enabled (units may start at boot and keep running after the final logout)" ;;
    Linger=no)  note "linger: disabled (units run only while this account has a login session; enabling linger is a separate Product Owner decision - docs/operations/development-quadlet.md)" ;;
    *)          note "linger: UNKNOWN (query succeeded but did not return exactly Linger=yes/Linger=no; persistence state unverified - enabling linger remains a separate Product Owner decision)" ;;
  esac
else
  note "linger: UNKNOWN (loginctl query failed with non-zero status; persistence state unverified regardless of any partial output - enabling linger remains a separate Product Owner decision)"
fi
# --- fail-closed preflight: refuse any pre-existing qdev resource or port conflict
exists_rc() { # exists_rc <kind> <cmd...>: rc 0=exists(die) 1=absent(ok) other=inspection error(die)
  local kind="$1" rc=0
  shift
  "$@" >/dev/null 2>&1 || rc=$?
  if [ "$rc" -eq 0 ]; then die "$kind already exists (${1} ${2}): this installer never adopts or resets existing resources"; fi
  if [ "$rc" -ne 1 ]; then die "$kind existence check failed (rc=$rc): an inspection error is never treated as absence"; fi
}
for n in "${NAMES[@]}"; do
  exists_rc container podman container exists "$n"
  exists_rc network   podman network   exists "$n"
  exists_rc volume    podman volume    exists "$n"
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
EXPECTED_SHA="${SONGHEALTH_QDEV_SOURCE_SHA:-}"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] \
  || die "SONGHEALTH_QDEV_SOURCE_SHA must name the exact PO-authorized 40-hex source SHA (fail-closed: no default)"
if ! SRC_SHA="$( cd "$SRC_CHECKOUT" && git rev-parse HEAD 2>&1 )"; then
  die "git inspection of the source checkout failed: $SRC_SHA (a git error is never accepted)"
fi
[[ "$SRC_SHA" == "$EXPECTED_SHA" ]] \
  || die "source HEAD $SRC_SHA does not equal the PO-authorized SONGHEALTH_QDEV_SOURCE_SHA $EXPECTED_SHA: refusing"
if DRIFT="$( cd "$SRC_CHECKOUT" && git status --porcelain --untracked-files=no 2>&1 )"; then
  [[ -z "$DRIFT" ]] || die "source checkout has tracked-file drift: a dirty tree is never installed"
else
  die "source tree inspection failed: $DRIFT"
fi
note "source checkout: $SRC_CHECKOUT @ $SRC_SHA (matches the PO-authorized SHA)"
printf '%s\n' "$SRC_SHA" > "$SRC_CHECKOUT/.songhealth-qdev-source-identity" \
  || die "could not write the source-identity marker"
[ -x "$SRC_CHECKOUT/node_modules/.bin/astro" ] || die "pinned dependencies incomplete in the checkout"
# --- environment files (0600; refuse overwrite) and podman secrets
ENV_DB="$UNIT_DIR/songhealth-dev-db.env"; ENV_APP="$UNIT_DIR/songhealth-dev-app.env"
for f in "$ENV_DB" "$ENV_APP"; do [[ -e "$f" ]] && die "$f already exists: refusing to overwrite existing credentials"; done
DB_PASS="$(openssl rand -hex 24)"; ENC_KEY="$(openssl rand -base64 32)"
umask 077; mkdir -p "$UNIT_DIR"
printf 'POSTGRES_USER=songhealth_qdev_admin\nPOSTGRES_DB=songhealth_qdev\n' > "$ENV_DB"
APP_PW="$(openssl rand -hex 24)"
printf 'HOST=0.0.0.0\nPORT=4321\nPGHOST=songhealth-qdev-db\nPGPORT=5432\nPGDATABASE=songhealth_qdev\nPGUSER=songhealth_qdev_app\nPGPASSWORD=%s\nEMDASH_SITE_URL=http://127.0.0.1:4324\n' \
  "$APP_PW" > "$ENV_APP"
# NOTE: the generated PGPASSWORD must be provisioned as the app role password during
# the fresh-install database step below; the migration URL and encryption key become
# podman secrets. Values are never echoed, logged, committed, or passed as process
# arguments: secrets travel only through stdin pipes into `podman secret create`
# and are consumed from mounted secret files (/run/secrets) inside containers.
printf '%s' "postgres://songhealth_qdev_app:${APP_PW}@songhealth-qdev-db:5432/songhealth_qdev" \
  | podman secret create songhealth-qdev-migration-database-url - || die "could not create migration-url secret"
printf '%s' "$ENC_KEY" | podman secret create songhealth-qdev-encryption-key - || die "could not create encryption-key secret"
printf '%s' "$DB_PASS" | podman secret create songhealth-qdev-db-password - || die "could not create db-password secret"
printf '%s' "$APP_PW" | podman secret create songhealth-qdev-app-password - || die "could not create app-password secret"
note "store $ENV_DB/$ENV_APP and secret names in the operator password vault now; then record the app-role password from $ENV_APP"
# --- quadlet units (idempotent copy, explicit list, nothing else)
confirm "install Quadlet units into $UNIT_DIR and reload the user systemd manager?"
for f in songhealth-dev.network songhealth-dev-db-data.volume songhealth-dev-media.volume songhealth-dev-db.container; do
  install -m 0644 "$QUADLET_SRC/$f" "$UNIT_DIR/$f" || die "install $f failed"
done
# F-04: the DEPLOYED app unit is rewritten to the immutable digest reference resolved
# above; the repository file stays tag-pinned with this behavior documented.
sed "s#^Image=docker.io/library/node:24.21.0\$#Image=docker.io/library/node@${NODE_DIGEST}#" \
  "$QUADLET_SRC/songhealth-dev-app.container" > "$UNIT_DIR/songhealth-dev-app.container" \
  || die "could not render the digest-pinned app unit"
grep -q "^Image=docker.io/library/node@sha256:" "$UNIT_DIR/songhealth-dev-app.container" \
  || die "digest pinning of the deployed app unit failed: refusing to continue"
install -m 0644 "$UNIT_DIR/songhealth-dev-app.container" "$UNIT_DIR/songhealth-dev-app.container" || true
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
# F1 (Phase 2A Corrective R1): the app-role password reaches psql ONLY through the
# stdin script stream (\set) — never in podman/psql argv, environment or metadata.
# APP_PW is openssl-rand-hex output (charset [0-9a-f]) so the \set quoting is exact,
# and SQL consumption stays psql's literal-quoted :'app_pw' interpolation.
{
  printf "\\set app_pw '%s'\n" "$APP_PW"
  cat <<'SQL'
CREATE ROLE songhealth_qdev_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE songhealth_qdev OWNER TO songhealth_qdev_app;
ALTER SCHEMA public OWNER TO songhealth_qdev_app;
SQL
} | podman exec -i songhealth-qdev-db psql -U songhealth_qdev_admin -d songhealth_qdev -v ON_ERROR_STOP=1 \
  || die "app role creation failed"
# --- native EmDash migrations via the pinned in-container CLI (fresh DB only)
# F1: the runner carries no secret in argv or container Env metadata — the three
# secret values are mounted as podman-secret files and read inside the container
# (same consumption pattern as the app unit start gate). The reader accepts the
# exact secret bytes (created without trailing newline) and fails closed on a
# missing, unreadable or empty secret file.
confirm "apply native EmDash migrations to the FRESH songhealth_qdev database now?"
( cd "$SRC_CHECKOUT" && podman run --rm --network songhealth-qdev -v "$SRC_CHECKOUT:/src:Z" -w /src \
    -e HOST=0.0.0.0 -e PORT=4321 -e EMDASH_SITE_URL=http://127.0.0.1:4324 \
    -e PGHOST=songhealth-qdev-db -e PGPORT=5432 -e PGDATABASE=songhealth_qdev -e PGUSER=songhealth_qdev_app \
    --secret=songhealth-qdev-app-password \
    --secret=songhealth-qdev-migration-database-url \
    --secret=songhealth-qdev-encryption-key \
    docker.io/library/node@${NODE_DIGEST} sh -c '
PGPASSWORD="$(cat /run/secrets/songhealth-qdev-app-password)" || exit 1
[ -n "$PGPASSWORD" ] || exit 1
EMDASH_MIGRATION_DATABASE_URL="$(cat /run/secrets/songhealth-qdev-migration-database-url)" || exit 1
[ -n "$EMDASH_MIGRATION_DATABASE_URL" ] || exit 1
EMDASH_ENCRYPTION_KEY="$(cat /run/secrets/songhealth-qdev-encryption-key)" || exit 1
[ -n "$EMDASH_ENCRYPTION_KEY" ] || exit 1
export PGPASSWORD EMDASH_MIGRATION_DATABASE_URL EMDASH_ENCRYPTION_KEY
exec node node_modules/emdash/dist/cli/index.mjs migrate --from-config --config astro.config.mjs' ) \
  || die "native migration failed: STOPPING before app start (database remains initialized; rerun requires Phase 2 gate re-authorization)"
confirm "enable + start songhealth-dev-app.service now?"
systemctl --user enable --now songhealth-dev-app.service || die "app service enable/start failed"
note "installation sequence complete; run scripts/dev-runtime-verify.sh and record its output as Phase 2 evidence"

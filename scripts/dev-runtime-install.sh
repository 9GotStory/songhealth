#!/usr/bin/env bash
# Songhealth development runtime — INSTALLER (UID-1000 rootless Podman + systemd Quadlet;
# Feature 002 T036). Converges this host to the single development runtime described in
# docs/operations/development-quadlet.md and is safe to re-run: every step checks the real
# state first and only adds what is missing. It never deletes data, never adopts a foreign
# or half-made resource, and never touches the retired UID-1001 runtime.
#   scripts/dev-runtime-install.sh --sha <40-hex commit to run>
# Run it from any checkout of this repository: it clones or verifies the runtime checkout
# at that commit, then continues with the installer of that commit, so the runtime is
# always defined by exactly one promoted commit.
set -Eeuo pipefail
set +a                         # an inherited allexport must never export generated credentials
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
# Report unexpected failures once, from the main shell (not from command substitutions).
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

SHA=''
while (( $# )); do
  case $1 in
    --sha) (( $# >= 2 )) || die "usage: ${0##*/} --sha <40-hex commit>"; SHA=$2; shift 2 ;;
    *) die "usage: ${0##*/} --sha <40-hex commit>" ;;
  esac
done
require_sha "$SHA"
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)

preflight() {
  local c st mem
  [[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
  for c in podman systemctl git curl openssl basenc python3 install ss; do
    command -v "$c" >/dev/null || die "required command not found: $c"
  done
  [[ -x $QUADLET ]] || die "Quadlet generator not found at $QUADLET"
  [[ ${XDG_CONFIG_HOME:-$HOME/.config} == "$HOME/.config" ]] \
    || die "XDG_CONFIG_HOME must be the default ~/.config: the units use %h-relative paths"
  st=$(systemctl --user is-system-running 2>/dev/null) || :
  case $st in
    running|degraded) ;;
    *) die "the systemd user manager is not ready (state: ${st:-unknown}); log in to a session first" ;;
  esac
  mem=$(awk '$1 == "MemAvailable:" { print int($2 / 1048576) }' /proc/meminfo)
  (( mem >= 4 )) || die "only ${mem} GiB memory available: free memory first (4 GiB minimum, 6 GiB recommended)"
  (( mem >= 6 )) || warn "only ${mem} GiB memory available (6 GiB recommended for npm ci and the dev server)"
  if ! systemctl --user is-active --quiet "$APP" && [[ -n $(ss -Htln "sport = :$PORT") ]]; then
    die "port $PORT is already in use by another process"
  fi
}

ensure_checkout() {
  local origin
  if [[ ! -e $SRC ]]; then
    origin=$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir) \
      || die "run this script from a checkout of the repository"
    note "cloning the runtime source checkout into $SRC"
    (umask 022 && git clone --quiet --no-checkout "$origin" "$SRC")
    if ! (umask 022 && git -C "$SRC" checkout --quiet --detach "$SHA"); then
      rm -rf -- "$SRC"            # created by this run and never checked out: nothing to keep
      die "commit $SHA is not reachable from the repository's branches (commit and branch it first)"
    fi
  fi
  [[ -d $SRC/.git ]] || die "$SRC must be a full clone (not a worktree): the app reads /src/.git/HEAD"
  [[ $(git -C "$SRC" rev-parse HEAD) == "$SHA" ]] \
    || die "$SRC is at another commit: move it with scripts/dev-runtime-update.sh --sha $SHA"
  [[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]] \
    || die "$SRC has modified tracked files: the runtime only serves a clean promoted commit"
  if git -C "$SRC" symbolic-ref -q HEAD >/dev/null; then
    git -C "$SRC" checkout --quiet --detach "$SHA"   # same commit; the entrypoint needs a detached HEAD
  fi
  if [[ -e $SRC/$MARKER ]]; then
    [[ $(<"$SRC/$MARKER") == "$SHA" ]] \
      || die "$SRC/$MARKER names another commit: promote with scripts/dev-runtime-update.sh"
  else
    printf '%s\n' "$SHA" > "$SRC/$MARKER"
  fi
  note "runtime source: $SRC @ $SHA"
}

ensure_images() {
  local img
  for img in "$(image_of songhealth-dev-app.container)" "$(image_of songhealth-dev-db.container)"; do
    [[ $img == *@sha256:* ]] || die "unit image is not pinned by digest: $img"
    if ! podman image exists "$img"; then
      note "pulling $img"
      podman pull --quiet "$img" >/dev/null
    fi
  done
}

ensure_dependencies() {
  local stamp=$SRC/node_modules/.songhealth-qdev-deps want
  want="$(sha256sum < "$SRC/package-lock.json" | cut -d' ' -f1) $(image_of songhealth-dev-app.container) npm@$NPM_VERSION"
  if [[ -f $stamp && $(<"$stamp") == "$want" ]]; then
    note "dependencies: up to date"
    return
  fi
  ! systemctl --user is-active --quiet "$APP" \
    || die "dependencies must be reinstalled while the app is running: use scripts/dev-runtime-update.sh"
  note "installing pinned dependencies (npm $NPM_VERSION ci) in a temporary container"
  podman run --rm --replace --pull=never --name songhealth-qdev-npm-ci \
    -v "$SRC:/src:z" -w /src "$(image_of songhealth-dev-app.container)" \
    sh -c "npm install --global --no-fund --no-audit --loglevel=error npm@$NPM_VERSION && npm ci --no-fund --no-audit"
  [[ -f $SRC/node_modules/astro/bin/astro.mjs ]] || die "npm ci finished without installing astro"
  printf '%s\n' "$want" > "$stamp"
}

ensure_secrets() {
  local s n=0 db_pw app_pw key
  for s in "${SECRETS[@]}"; do
    if podman secret exists "$s"; then n=$((n + 1)); fi
  done
  if (( n == ${#SECRETS[@]} )); then note "secrets: present"; return; fi
  (( n == 0 )) || die "only $n of ${#SECRETS[@]} runtime secrets exist (an interrupted install): run scripts/dev-runtime-uninstall.sh --purge, then install again"
  if podman volume exists "$DB_VOLUME" && db_has_cluster; then
    die "the database volume holds a cluster but its secrets are gone: restore them, or purge with scripts/dev-runtime-uninstall.sh --purge"
  fi
  db_pw=$(openssl rand -hex 24)
  app_pw=$(openssl rand -hex 24)
  key=emdash_enc_v1_$(openssl rand 32 | basenc --base64url | tr -d '=\n')   # EmDash v1 key format
  [[ $db_pw =~ ^[0-9a-f]{48}$ && $app_pw =~ ^[0-9a-f]{48}$ && $key =~ ^emdash_enc_v1_[A-Za-z0-9_-]{43}$ ]] \
    || die "credential generation failed"
  # Values travel only through stdin pipes from shell builtins: never argv, env or output.
  printf '%s' "$db_pw" | podman secret create --label "$LABEL" songhealth-qdev-db-password - >/dev/null
  printf '%s' "$app_pw" | podman secret create --label "$LABEL" songhealth-qdev-app-password - >/dev/null
  printf '%s' "postgres://songhealth_qdev_app:$app_pw@songhealth-qdev-db:5432/songhealth_qdev" \
    | podman secret create --label "$LABEL" songhealth-qdev-migration-database-url - >/dev/null
  printf '%s' "$key" | podman secret create --label "$LABEL" songhealth-qdev-encryption-key - >/dev/null
  db_pw='' app_pw='' key=''
  note "secrets: created (${#SECRETS[@]} podman secrets)"
}

ensure_route_token() { # the T021 fixture route token pair: server podman secret + 0600 client copy
  local token
  if podman secret exists "$ROUTE_SECRET" && [[ -s $ROUTE_ACCESS ]]; then
    note "T021 route token: present"
    return
  fi
  # A half pair is replaced whole (the client copy is never read back from the secret). The
  # token protects no data; the app only has to restart to load the new one.
  if systemctl --user is-active --quiet "$APP"; then
    note "stopping $APP to replace the T021 route token"
    systemctl --user stop "$APP"
  fi
  install -d -m 0700 -- "$STATE_DIR"
  rm -f -- "$ROUTE_ACCESS"
  token=$(openssl rand -hex 32)
  [[ $token =~ ^[0-9a-f]{64}$ ]] || die "T021 route token generation failed"
  printf '%s' "$token" | podman secret create --replace --label "$LABEL" "$ROUTE_SECRET" - >/dev/null
  printf '%s' "$token" | python3 -I -c '
import json, os, sys
fd = os.open(sys.argv[1], os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
os.write(fd, json.dumps({"token": sys.stdin.read()}).encode())
os.close(fd)' "$ROUTE_ACCESS"
  token=''
  note "T021 route token: created (podman secret $ROUTE_SECRET; client copy $ROUTE_ACCESS, mode 0600)"
}

ensure_volume() { # ensure_volume NAME [MARKER] — a label-owned volume; MARKER for a new media store
  local name=$1 marker=${2:-} p
  if ! podman volume exists "$name"; then
    podman volume create --label "$LABEL" "$name" >/dev/null
    if [[ -n $marker ]]; then
      p=$(volume_path "$name")
      podman unshare touch "$p/$marker"
    fi
    note "volume $name: created"
    return
  fi
  [[ $(podman volume inspect --format '{{index .Labels "io.songhealth.runtime"}}' "$name") == qdev ]] \
    || die "volume $name exists without the $LABEL label: refusing to adopt a volume this installer did not create"
  if [[ -n $marker ]]; then
    p=$(volume_path "$name")
    podman unshare test -f "$p/$marker" \
      || die "volume $name lost its store marker: restore it from a backup (see the docs) instead of reusing it"
  fi
  note "volume $name: present"
}

install_units() {
  local u d svc changed=()
  mkdir -p -- "$UNIT_DIR" "$STATE_DIR"
  chmod 0700 "$STATE_DIR"
  # The postgres entrypoint lists this directory as the unprivileged postgres user.
  install -d -m 0755 -- "$SHARE_DIR/initdb"
  install -m 0644 -- "$SRC/deploy/dev-quadlet/initdb/10-songhealth-app-role.sh" "$SHARE_DIR/initdb/"
  for u in "${UNITS[@]}"; do
    cmp -s -- "$SRC/deploy/dev-quadlet/$u" "$UNIT_DIR/$u" && continue
    install -m 0644 -- "$SRC/deploy/dev-quadlet/$u" "$UNIT_DIR/$u"
    changed+=("$u")
  done
  d=$(mktemp -d)
  "$QUADLET" -dryrun -user >"$d/out" 2>"$d/err" || :
  for u in "$APP" "$DB"; do
    if ! grep -qxF -- "---$u---" "$d/out"; then
      grep -F songhealth-dev "$d/err" >&2 || :
      rm -rf -- "$d"
      die "Quadlet did not generate $u from the installed units"
    fi
  done
  rm -rf -- "$d"
  systemctl --user daemon-reload
  if (( ${#changed[@]} )); then
    note "units installed or updated: ${changed[*]}"
    # A running service only picks up a changed unit when restarted.
    for u in "${changed[@]}"; do
      case $u in
        songhealth-dev-db.container) svc=$DB ;;
        songhealth-dev-app.container) svc=$APP ;;
        *) continue ;;
      esac
      if systemctl --user is-active --quiet "$svc"; then systemctl --user restart "$svc"; fi
    done
  else
    note "units: up to date"
  fi
}

start_db() {
  local out
  if ! db_has_cluster; then
    : > "$STATE_DIR/db-first-init"      # authorizes exactly this first initialization
    note "starting $DB (first start: initializing the database cluster)"
  fi
  systemctl --user start "$DB" || die "$DB failed to start: journalctl --user -u $DB -n 50"
  out=$(db_sql "$ROLE_SQL") || out=
  [[ $out == "$ROLE_OK" ]] \
    || die "the least-privilege app role is missing or wrong (got '${out:-none}'): the first initialization did not complete; the database holds no application data yet, so run scripts/dev-runtime-uninstall.sh --purge and install again"
  rm -f -- "$STATE_DIR/db-first-init"
  note "database: ready (least-privilege role songhealth_qdev_app owns songhealth_qdev)"
}

start_app() {
  if systemctl --user is-active --quiet "$APP"; then note "application: running"; return; fi
  note "starting $APP (the first start compiles and applies EmDash migrations: allow a few minutes)"
  systemctl --user start "$APP" || die "$APP failed to start: journalctl --user -u $APP -n 80"
}

ensure_setup() { # EmDash's native development setup, exactly once per database
  local need d
  need=$(setup_needed) || die "could not read $ORIGIN/_emdash/api/setup/status"
  if [[ $need == false ]]; then note "EmDash setup: complete"; return; fi
  [[ ! -e $STATE_DIR/dev-pat ]] \
    || die "setup is incomplete but $STATE_DIR/dev-pat already exists: inspect before running setup again"
  note "EmDash setup: running the native dev-bypass once (Feature 002 seed, dev admin, test PAT)"
  d=$(mktemp -d)
  if ! curl -fsS --max-time 300 -X POST -H 'X-EmDash-Request: 1' -o "$d/response.json" \
       "$ORIGIN/_emdash/api/setup/dev-bypass?content=0&token=1"; then
    rm -rf -- "$d"
    die "setup/dev-bypass failed: journalctl --user -u $APP -n 80"
  fi
  # The PAT goes straight from the response file to a new 0600 file; it is never printed.
  if ! python3 -I - "$d/response.json" "$STATE_DIR/dev-pat" <<'PY'
import json, os, sys
token = json.load(open(sys.argv[1]))["data"].get("token")
if not token:
    sys.exit(1)
fd = os.open(sys.argv[2], os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
os.write(fd, token.encode())
os.close(fd)
PY
  then
    rm -rf -- "$d"
    die "setup/dev-bypass returned no development token"
  fi
  rm -rf -- "$d"
  [[ $(setup_needed) == false ]] || die "setup/dev-bypass ran but EmDash still reports setup as incomplete"
  note "EmDash setup: complete; development PAT saved to $STATE_DIR/dev-pat (mode 0600)"
}

preflight
ensure_checkout
if [[ $HERE != "$(cd "$SRC" && pwd -P)" ]]; then
  note "continuing with the installer of the promoted commit"
  exec "$SRC/scripts/dev-runtime-install.sh" --sha "$SHA"
fi
ensure_images
ensure_dependencies
ensure_secrets
ensure_route_token
ensure_volume "$DB_VOLUME"
ensure_volume "$MEDIA_VOLUME" "$MEDIA_MARKER"
install_units
start_db
start_app
ensure_setup
"$SRC/scripts/dev-runtime-verify.sh" || die "verification failed: see the FAIL lines above"
cat <<EOF

Songhealth development runtime is ready: $ORIGIN/
  Admin (dev-bypass login): $ORIGIN/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin
  Development PAT (0600):   $STATE_DIR/dev-pat
  T021 route token (0600):  $ROUTE_ACCESS
  Logs:                     journalctl --user -u $APP -f
  Promote a new commit:     $SRC/scripts/dev-runtime-update.sh --sha <commit>
EOF

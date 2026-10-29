# shellcheck shell=bash disable=SC2034  # the variables are used by the sourcing scripts
# Songhealth development runtime — shared definitions for the dev-runtime-*.sh scripts
# (Feature 002 T036). Sourced, never executed: one place for names, paths and helpers so
# the installer, updater, verifier and uninstaller cannot drift apart.
# Contract: docs/operations/development-quadlet.md.

export LC_ALL=C                                   # stable tool output (the host locale is th_TH)

SRC=$HOME/dev/songhealth-quadlet                  # runtime source checkout, bind-mounted at /src
UNIT_DIR=$HOME/.config/containers/systemd         # rootless Quadlet search path
SHARE_DIR=$HOME/.local/share/songhealth-qdev      # db init script (mounted read-only)
STATE_DIR=$HOME/.local/state/songhealth-qdev      # development PAT, backups, first-init flag
MARKER=.songhealth-qdev-source-identity           # promoted commit, checked by the app entrypoint
MEDIA_MARKER=.songhealth-qdev-media-store
PORT=4324
ORIGIN=http://127.0.0.1:$PORT
NPM_VERSION=12.2.0
QUADLET=/usr/libexec/podman/quadlet
APP=songhealth-dev-app.service
DB=songhealth-dev-db.service
APP_CTR=songhealth-qdev-app
DB_CTR=songhealth-qdev-db
DB_VOLUME=songhealth-qdev-db-data
MEDIA_VOLUME=songhealth-qdev-media
NETWORK=songhealth-qdev
LABEL=io.songhealth.runtime=qdev
UNITS=(songhealth-dev.network songhealth-dev-db-data.volume songhealth-dev-media.volume
  songhealth-dev-db.container songhealth-dev-app.container)
SECRETS=(songhealth-qdev-db-password songhealth-qdev-app-password
  songhealth-qdev-migration-database-url songhealth-qdev-encryption-key)
# The T021 public-read fixture route token (T037): a test-only pair, the server's podman
# secret plus a 0600 client copy for the coordinator, always created and replaced together.
# It protects no data, so it stays outside the all-or-none runtime secrets above.
ROUTE_SECRET=songhealth-qdev-t021-route-token
ROUTE_ACCESS=$STATE_DIR/t021-route-access.json
ROUTE_PATH=/__feature002/public-reads
# The T019/T020 role fixture (T022): a second native account with its own 0600 PAT. EmDash
# offers no native way to create it on this runtime (an invite completes only with a passkey,
# and browsers reject the IP rpId 127.0.0.1), so the installer writes the same user row as
# EmDash's dev-bypass and a token row in EmDash's own format. Its home role is Author (30).
ROLE_FIXTURE=$STATE_DIR/role-fixture-pat
ROLE_FIXTURE_EMAIL=role-fixture@songhealth.test
ROLE_FIXTURE_ROLE=30
# Expected least-privilege role vector: login, not superuser/createdb/createrole, owns the db.
ROLE_SQL="SELECT concat_ws('|', r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, pg_get_userbyid(d.datdba))
  FROM pg_roles r, pg_database d WHERE r.rolname = 'songhealth_qdev_app' AND d.datname = 'songhealth_qdev'"
ROLE_OK='t|f|f|f|songhealth_qdev_app'
MODEL_PENDING=3                                   # model_update --check: changes are pending

die()  { printf '%s: FAIL: %s\n' "${0##*/}" "$*" >&2; exit 1; }
note() { printf '%s: %s\n' "${0##*/}" "$*"; }
warn() { printf '%s: WARNING: %s\n' "${0##*/}" "$*" >&2; }

image_of() { # image_of UNIT-FILE — the pinned Image= of a committed unit (single source of truth)
  sed -n 's/^Image=//p' "$SRC/deploy/dev-quadlet/$1"
}
volume_path() { podman volume inspect --format '{{.Mountpoint}}' "$1"; }
db_has_cluster() { # the data volume holds an initialized PostgreSQL 18 cluster
  local p
  p=$(volume_path "$DB_VOLUME") && podman unshare test -e "$p/18/docker/PG_VERSION"
}
db_sql() { # db_sql SQL — one query as the bootstrap superuser over the container's local socket
  podman exec "$DB_CTR" psql -X -q -At -v ON_ERROR_STOP=1 -U songhealth_qdev_admin -d songhealth_qdev -c "$1"
}
setup_needed() { # prints true or false from EmDash's native setup status endpoint
  curl -fsS --max-time 60 "$ORIGIN/_emdash/api/setup/status" \
    | python3 -I -c 'import json, sys; print(str(json.load(sys.stdin)["data"]["needsSetup"]).lower())'
}
require_sha() { [[ ${1:-} =~ ^[0-9a-f]{40}$ ]] || die "--sha must name a full 40-hex commit"; }
backup_runtime() { # database and media into a new $STATE_DIR/backups/<UTC> directory, named in BACKUP_DIR
  BACKUP_DIR=$STATE_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)
  install -d -m 0700 -- "$STATE_DIR/backups" "$BACKUP_DIR"
  "$SRC/scripts/dev-runtime-backup.sh" "$BACKUP_DIR" || die "backup failed: nothing was changed"
  note "backup written to $BACKUP_DIR"
}
model_update() { # model_update [--check] — the promoted commit's scripts/model-update.mjs, run in the
  # app container on its pinned Node, with the development PAT on stdin
  [[ -s $STATE_DIR/dev-pat && $(stat -c %a "$STATE_DIR/dev-pat") == 600 ]] \
    || { warn "the development PAT $STATE_DIR/dev-pat is missing or not mode 0600"; return 1; }
  podman exec -i "$APP_CTR" node /src/scripts/model-update.mjs --origin "$ORIGIN" "$@" \
    < "$STATE_DIR/dev-pat"
}
pat_identity() { # pat_identity FILE — prints "email role" for a 0600 PAT file (token sent on stdin)
  local token
  [[ -s $1 && $(stat -c %a "$1") == 600 ]] || return 1
  token=$(<"$1")
  printf 'Authorization: Bearer %s\n' "$token" \
    | curl -fsS --max-time 30 -H @- "$ORIGIN/_emdash/api/auth/me" \
    | python3 -I -c 'import json, sys; d = json.load(sys.stdin)["data"]; print(d["email"], d["role"])'
}

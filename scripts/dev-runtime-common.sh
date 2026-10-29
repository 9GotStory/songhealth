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
# Expected least-privilege role vector: login, not superuser/createdb/createrole, owns the db.
ROLE_SQL="SELECT concat_ws('|', r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, pg_get_userbyid(d.datdba))
  FROM pg_roles r, pg_database d WHERE r.rolname = 'songhealth_qdev_app' AND d.datname = 'songhealth_qdev'"
ROLE_OK='t|f|f|f|songhealth_qdev_app'

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

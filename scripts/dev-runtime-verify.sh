#!/usr/bin/env bash
# Songhealth development runtime — VERIFY (Feature 002 T036). Read-only: it changes
# nothing and prints no secret. One PASS/FAIL line per check, then VERIFY: PASS, or
# VERIFY: FAIL with a non-zero exit. Safe to run at any time after installation.
set -uo pipefail
set +a
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

failed=0
check() { # check DESCRIPTION COMMAND... — the command's output is discarded
  local d=$1
  shift
  if "$@" >/dev/null 2>&1; then printf 'PASS: %s\n' "$d"; else printf 'FAIL: %s\n' "$d"; failed=1; fi
}
healthy() { [[ $(podman inspect --format '{{.State.Health.Status}}' "$1" 2>/dev/null) == healthy ]]; }
ports_ok() { [[ $(podman port "$APP_CTR") == "$PORT/tcp -> 127.0.0.1:$PORT" && -z $(podman port "$DB_CTR") ]]; }
ssr_ok() { curl -fsS --max-time 30 "$ORIGIN/" | grep -q 'name="songhealth-foundation"'; }
admin_ok() { [[ $(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 30 "$ORIGIN/_emdash/admin/") == 200 ]]; }
setup_ok() { [[ $(setup_needed) == false ]]; }
migrations_ok() { podman exec "$APP_CTR" /bin/sh /src/scripts/dev-runtime-entrypoint.sh migrate-check; }
role_ok() { [[ $(db_sql "$ROLE_SQL") == "$ROLE_OK" ]]; }
source_ok() {
  [[ $(git -C "$SRC" rev-parse HEAD) == "$(<"$SRC/$MARKER")" ]] \
    && [[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]]
}
key_ok() { ! podman logs "$APP_CTR" 2>&1 | grep -q 'EMDASH_ENCRYPTION_KEY is invalid'; }
pat_ok() { # the development PAT authenticates (sent on stdin: never in argv or output)
  local token
  [[ -s $STATE_DIR/dev-pat && $(stat -c %a "$STATE_DIR/dev-pat") == 600 ]] || return 1
  token=$(<"$STATE_DIR/dev-pat")
  printf 'Authorization: Bearer %s\n' "$token" \
    | curl -fsS --max-time 30 -H @- -o /dev/null "$ORIGIN/_emdash/api/auth/me"
}

check "$DB active" systemctl --user is-active --quiet "$DB"
check "$APP active" systemctl --user is-active --quiet "$APP"
check "database container healthy" healthy "$DB_CTR"
check "application container healthy" healthy "$APP_CTR"
check "published only on 127.0.0.1:$PORT (database has no host port)" ports_ok
check "public SSR marker served at $ORIGIN/" ssr_ok
check "native Admin UI reachable at $ORIGIN/_emdash/admin/" admin_ok
check "EmDash setup complete" setup_ok
check "native migrations: none pending or unknown (emdash migrate --check)" migrations_ok
check "least-privilege app role owns songhealth_qdev" role_ok
check "runtime source is the promoted commit, clean" source_ok
check "EmDash accepted EMDASH_ENCRYPTION_KEY" key_ok
check "development PAT (mode 0600) authenticates" pat_ok
printf 'runtime source: %s @ %s\n' "$SRC" "$(git -C "$SRC" rev-parse HEAD 2>/dev/null || printf unknown)"
if (( failed )); then echo "VERIFY: FAIL"; exit 1; fi
echo "VERIFY: PASS"

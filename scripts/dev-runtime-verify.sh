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
# Outputs are captured whole before matching: under pipefail, `| grep -q` fails the check
# (curl exit 23) or hides a match (SIGPIPE) once the output outgrows the pipe buffer.
ssr_ok() { local page; page=$(curl -fsS --max-time 30 "$ORIGIN/") && [[ $page == *'name="songhealth-foundation"'* ]]; }
admin_ok() { [[ $(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 30 "$ORIGIN/_emdash/admin/") == 200 ]]; }
setup_ok() { [[ $(setup_needed) == false ]]; }
migrations_ok() { podman exec "$APP_CTR" /bin/sh /src/scripts/dev-runtime-entrypoint.sh migrate-check; }
role_ok() { [[ $(db_sql "$ROLE_SQL") == "$ROLE_OK" ]]; }
source_ok() {
  [[ $(git -C "$SRC" rev-parse HEAD) == "$(<"$SRC/$MARKER")" ]] \
    && [[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]]
}
key_ok() { local logs; logs=$(podman logs "$APP_CTR" 2>&1) && [[ $logs != *'EMDASH_ENCRYPTION_KEY is invalid'* ]]; }
pat_ok() { [[ $(pat_identity "$STATE_DIR/dev-pat") == 'dev@emdash.local 50' ]]; }
fixture_ok() { [[ $(pat_identity "$ROLE_FIXTURE") == "$ROLE_FIXTURE_EMAIL $ROLE_FIXTURE_ROLE" ]]; }
route_ok() { # the dev-only T021 fixture answers its probe with the 0600 client token, refuses without
  [[ $(stat -c %a "$ROUTE_ACCESS" 2>/dev/null) == 600 ]] || return 1
  python3 -I - "$ROUTE_ACCESS" "$ORIGIN$ROUTE_PATH?case=probe" <<'PY'
import json, sys, urllib.error, urllib.request
token = json.load(open(sys.argv[1]))["token"]
def get(headers):
    try:
        with urllib.request.urlopen(urllib.request.Request(sys.argv[2], headers=headers), timeout=30) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, {}
status, body = get({"x-songhealth-t021-route-access": token})
anonymous, _ = get({})
sys.exit(0 if (status, body.get("fixtureId"), anonymous) == (200, "songhealth:t021:cms-public-reads", 403) else 1)
PY
}
model_ok() { # the model-update step's own read-only check, on the promoted commit's seed
  [[ $(stat -c %a "$STATE_DIR/dev-pat" 2>/dev/null) == 600 ]] || return 1
  podman exec -i "$APP_CTR" node /src/scripts/model-update.mjs --check --origin "$ORIGIN" \
    < "$STATE_DIR/dev-pat"
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
check "role fixture PAT (mode 0600) authenticates as an enabled Author" fixture_ok
check "T021 fixture route answers its 0600 route token and refuses without it" route_ok
check "the database has the seed's content model (scripts/dev-runtime-model-update.sh applies it)" model_ok
printf 'runtime source: %s @ %s\n' "$SRC" "$(git -C "$SRC" rev-parse HEAD 2>/dev/null || printf unknown)"
if (( failed )); then echo "VERIFY: FAIL"; exit 1; fi
echo "VERIFY: PASS"

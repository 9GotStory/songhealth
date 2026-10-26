#!/usr/bin/env bash
# Songhealth development Quadlet runtime — VERIFY (read-only checks only).
# Never mutates, restarts, or secrets-reads; safe to run any time after Phase 2
# installation. Exits non-zero on any failed check with one PASS/FAIL line each.
set -Euo pipefail
fail=0
ok()   { echo "PASS: $*"; }
bad()  { echo "FAIL: $*" >&2; fail=1; }
systemctl --user is-active --quiet songhealth-dev-db.service  && ok "songhealth-dev-db.service active" || bad "songhealth-dev-db.service not active"
systemctl --user is-active --quiet songhealth-dev-app.service && ok "songhealth-dev-app.service active" || bad "songhealth-dev-app.service not active"
podman container exists songhealth-qdev-db  && ok "db container exists" || bad "db container missing"
podman container exists songhealth-qdev-app && ok "app container exists" || bad "app container missing"
[[ "$(podman inspect --format '{{.State.Health.Status}}' songhealth-qdev-db 2>/dev/null)" == "healthy" ]] && ok "db healthy" || bad "db not healthy"
[[ "$(podman inspect --format '{{.State.Health.Status}}' songhealth-qdev-app 2>/dev/null)" == "healthy" ]] && ok "app healthy" || bad "app not healthy"
BODY="$(curl -fsS --max-time 10 http://127.0.0.1:4324/ 2>/dev/null || true)"
[[ "$BODY" == *songhealth-foundation* ]] && ok "public SSR marker served on 127.0.0.1:4324" || bad "public SSR marker not served on 127.0.0.1:4324"
curl -fsS --max-time 10 -o /dev/null http://127.0.0.1:4324/_emdash/admin/ && ok "native Admin UI reachable (unauthenticated boundary)" || bad "native Admin UI unreachable"
SRC="$HOME/dev/songhealth-quadlet"
if [[ -d "$SRC/.git" ]]; then
  SHA="$( cd "$SRC" && git rev-parse HEAD )" && ok "source identity: $SHA" || bad "source checkout unreadable"
  ( cd "$SRC" && git status --porcelain --untracked-files=no | grep -q . ) && bad "source checkout has tracked-file drift" || ok "source checkout clean (tracked files)"
else
  bad "source checkout missing at $SRC"
fi
# non-mutating native migration check inside the running app container
podman exec songhealth-qdev-app sh -c 'IFS= read -r U </run/secrets/songhealth-qdev-migration-database-url; export EMDASH_MIGRATION_DATABASE_URL="$U"; IFS= read -r K </run/secrets/songhealth-qdev-encryption-key; export EMDASH_ENCRYPTION_KEY="$K"; node node_modules/emdash/dist/cli/index.mjs migrate --from-config --config astro.config.mjs --check' \
  && ok "native migration check: no pending/unknown migrations" || bad "native migration check failed (pending/unknown or error)"
[[ "$fail" -eq 0 ]] && echo "VERIFY: PASS" || { echo "VERIFY: FAIL" >&2; exit 1; }

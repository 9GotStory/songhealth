#!/usr/bin/env bash
# T036 live acceptance checks beyond dev-runtime-verify.sh (scratch tooling, not repo source).
# Prints PASS/FAIL lines only; never prints the PAT, cookies or secret values. Cleans up every
# fixture it creates (one synthetic media item, one untracked probe page, a cookie jar).
set -uo pipefail
export LC_ALL=C
ORIGIN=http://127.0.0.1:4324
SRC=$HOME/dev/songhealth-quadlet
PAT_FILE=$HOME/.local/state/songhealth-qdev/dev-pat
W=$(mktemp -d)                      # 0700 scratch for the cookie jar and responses
trap 'rm -rf -- "$W"; rm -f -- "$SRC/src/pages/t036-hmr-probe.astro"' EXIT
fail=0
pass() { printf 'PASS: %s\n' "$*"; }
bad()  { printf 'FAIL: %s\n' "$*"; fail=1; }
auth() { printf 'Authorization: Bearer %s\nX-EmDash-Request: 1\n' "$(<"$PAT_FILE")"; }

# 1. dev-bypass login gives an admin session (cookie jar stays in the 0700 scratch dir)
code=$(curl -sS -c "$W/jar" -o /dev/null -w '%{http_code}' "$ORIGIN/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin")
me=$(curl -sS -b "$W/jar" "$ORIGIN/_emdash/api/auth/me" | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["data"]; print(d.get("email",""), d.get("role",""))' 2>/dev/null)
[[ $code == 200 && $me == "dev@emdash.local "* ]] && pass "dev-bypass login -> session user ${me}" || bad "dev-bypass login (http $code, me='${me}')"

# 2. media upload through the API lands in the persistent media volume
python3 -I -c 'import base64,sys; sys.stdout.buffer.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="))' > "$W/t036-probe.png"
auth | curl -sS -H @- -o "$W/up.json" -w '%{http_code}' -F "file=@$W/t036-probe.png;type=image/png" "$ORIGIN/_emdash/api/media" > "$W/up.code"
MID=$(python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1]))["data"]; d=d.get("item",d); print(d.get("id",""))' "$W/up.json" 2>/dev/null)
MURL=$(python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1]))["data"]; d=d.get("item",d); print(d.get("url",""))' "$W/up.json" 2>/dev/null)
if [[ $(<"$W/up.code") =~ ^20[01]$ && -n $MID ]]; then pass "media upload accepted (id $MID)"; else bad "media upload (http $(<"$W/up.code"))"; fi
MP=$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)
n=$(podman unshare find "$MP" -type f ! -name .songhealth-qdev-media-store | wc -l)
(( n >= 1 )) && pass "media volume holds the uploaded file ($n file(s) besides the marker)" || bad "no uploaded file in the media volume"

# 3. restart persistence: restart the database (the app restarts with it), then re-check
systemctl --user restart songhealth-dev-db.service && systemctl --user start songhealth-dev-app.service \
  && pass "database + app restarted" || bad "restart"
[[ -n $MURL ]] && code=$(curl -sS -o /dev/null -w '%{http_code}' "$ORIGIN$MURL") || code=none
[[ $code == 200 ]] && pass "uploaded media still served after restart ($MURL)" || bad "media after restart (http $code)"
code=$(auth | curl -sS -H @- -o /dev/null -w '%{http_code}' "$ORIGIN/_emdash/api/auth/me")
[[ $code == 200 ]] && pass "PAT still authenticates after restart (data persisted)" || bad "PAT after restart (http $code)"

# 4. file watching / dev reload: an untracked probe page appears, then disappears
printf -- '---\n---\n<p>t036-hmr-probe-%s</p>\n' "$$" > "$SRC/src/pages/t036-hmr-probe.astro"
ok=no; for _ in $(seq 1 30); do curl -fsS "$ORIGIN/t036-hmr-probe" 2>/dev/null | grep -q "t036-hmr-probe-$$" && { ok=yes; break; }; sleep 1; done
[[ $ok == yes ]] && pass "dev server picked up a new page without restart (file watching works)" || bad "new page not served"
rm -f -- "$SRC/src/pages/t036-hmr-probe.astro"
ok=no; for _ in $(seq 1 30); do code=$(curl -sS -o /dev/null -w '%{http_code}' "$ORIGIN/t036-hmr-probe"); [[ $code == 404 ]] && { ok=yes; break; }; sleep 1; done
[[ $ok == yes ]] && pass "probe page removed again (404)" || bad "probe page still served after removal (http $code)"

# 5. clean up the synthetic media fixture
if [[ -n $MID ]]; then
  code=$(auth | curl -sS -H @- -X DELETE -o /dev/null -w '%{http_code}' "$ORIGIN/_emdash/api/media/$MID")
  [[ $code =~ ^20[04]$ ]] && pass "synthetic media fixture deleted" || bad "media fixture delete (http $code) - remove id $MID manually"
fi

# 6. resource use (informational)
podman stats --no-stream --format '{{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' songhealth-qdev-app songhealth-qdev-db | sed 's/^/INFO: /'
(( fail )) && { echo "ACCEPTANCE: FAIL"; exit 1; }
echo "ACCEPTANCE: PASS"

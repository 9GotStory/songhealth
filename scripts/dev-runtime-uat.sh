#!/usr/bin/env bash
# Songhealth development runtime — the Thai search UAT through a Tailscale Funnel (#238; the Product
# Owner's decisions in #238 comment 6762442208). A read-only proxy listens on loopback in front of
# the runtime (scripts/uat-proxy.ts), and a separate, ephemeral Tailscale node funnels its own
# https://songhealth-uat.<tailnet>.ts.net on 443 to it. The host's own Tailscale Serve and Funnel
# configuration stays untouched. Both run as rootless Podman containers on the host network while
# the UAT lasts; stop removes them and the node. The steps are in
# docs/operations/development-quadlet.md "Thai search UAT through a Tailscale Funnel".
#   scripts/dev-runtime-uat.sh start            # the proxy, its check, the node's login link, the URL
#   scripts/dev-runtime-uat.sh check [<origin>] # the proxy's rules at <origin>, by default the proxy
#   scripts/dev-runtime-uat.sh stop             # the node leaves the tailnet; both containers go
#   scripts/dev-runtime-uat.sh status
set -Eeuo pipefail
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)  # the checkout whose proxy runs
UAT_DIR=$STATE_DIR/uat                                 # the node's serve config, the host's status
PROXY_CTR=songhealth-uat-proxy
NODE_CTR=songhealth-uat-tailscale
UAT_LABEL=io.songhealth.runtime=uat
PROXY_PORT=4325
PROXY=http://127.0.0.1:$PROXY_PORT
NODE_NAME=songhealth-uat
NODE_IMAGE=docker.io/tailscale/tailscale:v1.104.4@sha256:ed6480b33c6eb67c9cbd203ed42b9fb57e361986725b6856def71b7a3d9e276c
NODE_SOCKET=/tmp/tailscaled.sock  # containerboot's default (tailscale v1.104.4 cmd/containerboot/settings.go)
REFERER=http://songhealth-unknown-referrer.invalid/   # the tests' synthetic referrer (playwright.config.ts)
QUERY=%E0%B8%A7%E0%B8%B1%E0%B8%84%E0%B8%8B%E0%B8%B5%E0%B8%99  # วัคซีน, percent-encoded

answer() { # answer URL [CURL-ARGS...] — "<status> <sha256 of the body, its random ids blanked>"
  local body status
  body=$(mktemp)
  status=$(curl -sS --max-time 60 -o "$body" -w '%{http_code}' -H "Referer: $REFERER" "${@:2}" "$1") \
    || status=000
  # Each render gives a card a new random id (servicecard-<uuid>), so the ids are blanked.
  printf '%s %s\n' "$status" "$(python3 -I -c '
import hashlib, re, sys
body = open(sys.argv[1], "rb").read()
print(hashlib.sha256(re.sub(rb"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", b"-", body)).hexdigest())
' "$body")"
  rm -f "$body"
}

first() { # first REGEX — the first match of REGEX on stdin, its group 1 if it has one
  python3 -I -c '
import re, sys
match = re.search(sys.argv[1], sys.stdin.read())
sys.exit(1) if match is None else print(match.group(match.lastindex or 0))
' "$1"
}

read_page() { # read_page URL [CURL-ARGS...] — the page at URL, as the tests' referrer reads it
  curl -fsS --max-time 60 -H "Referer: $REFERER" "${@:2}" "$1"
}

check() { # check AT — the proxy's rules and pages at the origin AT, against the runtime's own ORIGIN
  local at=$1 failed=0 host=() home filter picture media path got want page status
  [[ $at == "$PROXY" ]] && host=(-H "Host: $NODE_NAME.invalid")  # the public URL sends its own
  pass() { printf 'PASS %s\n' "$*"; }
  fail() { printf 'FAIL %s\n' "$*"; failed=1; }

  home=$(read_page "$ORIGIN/") || die "the runtime did not answer $ORIGIN/"
  filter=$(read_page "$ORIGIN/news/health" | first '<option value="([^"]+)"') || filter=
  picture=$(first '/_image\?href=[^" ]+' <<<"$home") && picture=${picture//&amp;/\&} || picture=
  # A picture's media file, which the page names inside its /_image address.
  media=$(first '_emdash%2Fapi%2Fmedia%2Ffile%2F[A-Za-z0-9._-]+' <<<"$home") \
    && media=/${media//%2F//} || media=
  [[ -n $filter && -n $picture && -n $media ]] \
    || die "the runtime's pages give no topic filter, picture or media file to check"

  for path in / "/search?q=$QUERY" "/news/health?topic=$filter" "$picture" "$media"; do
    got=$(answer "$at$path" "${host[@]}")
    want=$(answer "$ORIGIN$path")
    if [[ $got == "$want" && $got == 200\ * ]]; then pass "GET $path answers as on loopback"
    else fail "GET $path answered '$got', loopback '$want'"; fi
  done
  # Each refusal as "<status> <path>"; the proxy answers them itself, so none reaches the runtime.
  for path in "403 /_emdash/admin" "403 /_emdash/api/auth/dev-bypass" \
    "403 /_emdash/api/setup/dev-bypass" "403 /_image?href=%2F_emdash%2Fapi%2Fsetup%2Fdev-bypass&w=64" \
    "400 /_%65mdash/api/setup/dev-bypass" "403 ${media/\/_emdash\/api\/media\/file/\/media}" \
    "403 ${media/\/_emdash\/api\/media\/file/\/@fs\/src\/media}" "403 /__open-in-editor"; do
    status=${path%% *} path=${path#* }
    got=$(answer "$at$path" "${host[@]}")
    if [[ $got == "$status "* ]]; then pass "GET $path is refused ($status)"
    else fail "GET $path answered '$got'"; fi
  done
  got=$(answer "$at/" "${host[@]}" -X POST)
  if [[ $got == 405\ * ]]; then pass "POST / is refused (405)"; else fail "POST / answered '$got'"; fi
  # The runtime's Vite server refuses another Host with 403, and the pages build their picture
  # addresses from the Host they reached the runtime with.
  page=$(read_page "$at/" "${host[@]}") || page=
  if [[ $page == *'href=http%3A%2F%2F127.0.0.1%3A4324%2F_emdash'* ]]; then
    pass "a request with another Host reaches the runtime as 127.0.0.1:4324"
  else fail "a request with another Host did not reach the runtime as 127.0.0.1:4324"; fi

  (( failed == 0 )) || { printf 'UAT CHECK: FAIL at %s\n' "$at"; return 1; }
  printf 'UAT CHECK: PASS at %s\n' "$at"
}

node_running() { # node_running — the UAT node's container exists and runs
  podman container exists "$NODE_CTR" && [[ $(podman inspect -f '{{.State.Running}}' "$NODE_CTR") == true ]]
}

node_json() { # node_json — the UAT node's `tailscale status --json`
  podman exec "$NODE_CTR" tailscale --socket="$NODE_SOCKET" status --json
}

stop_all() { # stop_all — the node leaves the tailnet, then both containers go
  # An ephemeral node that logs out is deleted from the tailnet at once.
  if node_running; then
    podman exec "$NODE_CTR" tailscale --socket="$NODE_SOCKET" logout >/dev/null 2>&1 \
      || warn "the node did not log out: it leaves the tailnet once it has been offline for a while"
  fi
  podman container exists "$NODE_CTR" && podman rm -f -t 10 "$NODE_CTR" >/dev/null
  if podman container exists "$PROXY_CTR"; then
    # One line per request it answered, refusals included, kept for the UAT's record.
    PROXY_LOG=$UAT_DIR/proxy-$(date -u +%Y%m%dT%H%M%SZ).log
    podman logs "$PROXY_CTR" > "$PROXY_LOG" 2>&1 || :
    podman rm -f -t 10 "$PROXY_CTR" >/dev/null
  fi
  rm -rf "$UAT_DIR/serve" "$UAT_DIR/url"
}

start() {
  local i state login='' url='' ctr
  for ctr in "$PROXY_CTR" "$NODE_CTR"; do
    ! podman container exists "$ctr" || die "$ctr exists: run '${0##*/} stop' first"
  done
  serves_marker "$ORIGIN" || die "the runtime does not answer at $ORIGIN"
  [[ -z $(ss -Hltn "sport = :$PROXY_PORT") ]] || die "port $PROXY_PORT is in use"
  install -d -m 0700 "$UAT_DIR" "$UAT_DIR/serve"
  tailscale serve status --json > "$UAT_DIR/host-serve-before.json" \
    || die "could not read this host's Tailscale Serve status"
  note "this host's Tailscale Serve status is saved in $UAT_DIR/host-serve-before.json"

  podman run -d --init --name "$PROXY_CTR" --label "$UAT_LABEL" --network host --read-only \
    --cap-drop all --security-opt no-new-privileges --security-opt label=disable --user node \
    -v "$ROOT/scripts/uat-proxy.ts:/proxy/uat-proxy.ts:ro" \
    -v "$ROOT/scripts/uat-proxy:/proxy/uat-proxy:ro" \
    "$(image_of songhealth-dev-app.container)" node /proxy/uat-proxy.ts "$PROXY_PORT" >/dev/null
  for (( i = 0; i < 30; i++ )); do
    curl -fsS --max-time 5 -o /dev/null -H "Referer: $REFERER" "$PROXY/" 2>/dev/null && break
    sleep 1
  done
  ss -Hltn "sport = :$PROXY_PORT" | awk '$4 !~ /^127\.0\.0\.1:/ { beyond = 1 } END { exit beyond }' \
    || { stop_all; die "the proxy listens beyond loopback"; }
  check "$PROXY" || { stop_all; die "the proxy failed its check: nothing is public"; }

  # shellcheck disable=SC2016  # ${TS_CERT_DOMAIN} is containerboot's placeholder for the node's name
  printf '%s\n' '{"TCP":{"443":{"HTTPS":true}},"Web":{"${TS_CERT_DOMAIN}:443":{"Handlers":{"/":{"Proxy":"'"$PROXY"'"}}}},"AllowFunnel":{"${TS_CERT_DOMAIN}:443":true}}' \
    > "$UAT_DIR/serve/serve.json"
  # No TS_STATE_DIR: containerboot then runs tailscaled with --state=mem:, which registers the node
  # as ephemeral, an interactive login included (tailscale v1.104.4 cmd/containerboot/tailscaled.go,
  # cmd/tailscaled/tailscaled.go). With no TS_AUTHKEY the node waits for someone to open its login
  # link and approve it in the tailnet's account (the Product Owner's decision, #238 comment
  # 6763361252, item 1). TS_BOOT_TIMEOUT, 60 s by default (cmd/containerboot/settings.go), gives that
  # approval the same ten minutes the loop below waits.
  podman run -d --name "$NODE_CTR" --label "$UAT_LABEL" --network host --read-only --cap-drop all \
    --security-opt no-new-privileges --security-opt label=disable \
    -e TS_HOSTNAME="$NODE_NAME" -e TS_USERSPACE=true -e TS_BOOT_TIMEOUT=10m \
    -e TS_SERVE_CONFIG=/config/serve.json -v "$UAT_DIR/serve:/config:ro" \
    "$NODE_IMAGE" >/dev/null
  for (( i = 0; i < 300; i++ )); do  # ten minutes for the approval
    state=$(node_json 2>/dev/null | python3 -I -c '
import json, sys
status = json.load(sys.stdin)
if status.get("BackendState") == "Running":
    print("up https://" + status["Self"]["DNSName"].rstrip("."))
elif status.get("AuthURL"):
    print("login " + status["AuthURL"])
' 2>/dev/null) || state=
    case $state in
      up\ *) url=${state#up }; break ;;
      login\ *) [[ -n $login ]] || { login=${state#login }; note "approve the node in Tailscale: $login"; } ;;
    esac
    node_running || { podman logs --tail 20 "$NODE_CTR" >&2 || :; stop_all; die "the Tailscale node stopped"; }
    sleep 2
  done
  [[ -n $url ]] || { stop_all; die "the node was not approved within ten minutes: nothing is public"; }
  printf '%s\n' "$url" > "$UAT_DIR/url"
  log_event "the UAT node is up: $url"
  note "the UAT node is up: $url"
  note "a new Funnel name can take some minutes to resolve: '${0##*/} check $url' checks it"
}

stop() {
  local now
  stop_all
  note "the UAT node and its proxy are gone"
  log_event "the UAT node and its proxy are gone${PROXY_LOG:+, proxy log $PROXY_LOG}"
  [[ -z ${PROXY_LOG:-} ]] || note "the proxy's log: $PROXY_LOG"
  [[ -f $UAT_DIR/host-serve-before.json ]] || { warn "no saved Serve status to compare"; return; }
  now=$(tailscale serve status --json) || die "could not read this host's Tailscale Serve status"
  if [[ $now == "$(<"$UAT_DIR/host-serve-before.json")" ]]; then
    note "this host's Tailscale Serve status is the same as before start"
  else
    die "this host's Tailscale Serve status changed since start: compare $UAT_DIR/host-serve-before.json"
  fi
  if tailscale status --json | python3 -I -c '
import json, sys
peers = (json.load(sys.stdin).get("Peer") or {}).values()
sys.exit(any(peer.get("HostName") == sys.argv[1] for peer in peers))
' "$NODE_NAME"; then
    note "no peer named $NODE_NAME is in this host's view of the tailnet"
  else
    warn "a peer named $NODE_NAME is still in this host's view of the tailnet"
  fi
}

status() {
  podman ps -a --filter "label=$UAT_LABEL" --format '{{.Names}} {{.Status}}'
  if [[ -f $UAT_DIR/url ]]; then note "the UAT URL: $(<"$UAT_DIR/url")"; else note "no UAT node is up"; fi
  last_event
}

USAGE="usage: ${0##*/} start | check [<origin>] | stop | status"
case ${1-} in
  start) (( $# == 1 )) || die "$USAGE"; start ;;
  check) (( $# <= 2 )) || die "$USAGE"; check "${2:-$PROXY}" ;;
  stop) (( $# == 1 )) || die "$USAGE"; stop ;;
  status) (( $# == 1 )) || die "$USAGE"; status ;;
  *) die "$USAGE" ;;
esac

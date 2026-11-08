#!/usr/bin/env bash
# Songhealth development runtime — a WINDOW holds the runtime while its data is taken away and
# brought back (#178 retro), so that no other session runs a suite or promotes a commit into it:
# dev-runtime-env.sh and dev-runtime-update.sh refuse while the lock exists. The steps are in
# docs/operations/development-quadlet.md "A window". It coordinates sessions: it is no access control.
#   scripts/dev-runtime-window.sh open "<why>"
#   scripts/dev-runtime-window.sh close
#   scripts/dev-runtime-window.sh status   # exit 0 with no window open, 1 with one
set -Eeuo pipefail
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

USAGE="usage: ${0##*/} open <why> | close | status"
case ${1-} in
  open)
    (( $# == 2 )) && [[ -n $2 ]] || die "$USAGE"
    ( set -C; printf '%s (opened %s)\n' "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$WINDOW_LOCK" ) 2>/dev/null \
      || die "a window already holds the runtime: $(<"$WINDOW_LOCK")"
    note "the window is open: scripts/dev-runtime-env.sh --in-window runs commands inside it"
    ;;
  close)
    (( $# == 1 )) || die "$USAGE"
    rm -f "$WINDOW_LOCK"
    note "no window holds the runtime"
    ;;
  status)
    (( $# == 1 )) || die "$USAGE"
    [[ -e $WINDOW_LOCK ]] || { note "no window holds the runtime"; exit 0; }
    note "a window holds the runtime: $(<"$WINDOW_LOCK")"
    exit 1
    ;;
  *) die "$USAGE" ;;
esac

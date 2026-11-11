#!/usr/bin/env bash
# Songhealth development runtime — a WINDOW holds the runtime while its data is taken away and
# brought back (#178 retro), so that no other session runs a suite or promotes a commit into it:
# dev-runtime-env.sh and dev-runtime-update.sh refuse from then on, while the lock exists; it cannot
# see a suite already running. The steps are in docs/operations/development-quadlet.md "A window".
# It coordinates sessions: it is no access control.
# The lock holds why the window opened, when, and the directory it was opened from, where the
# holder's checkout and its scripts are (#240 retro).
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
    [[ ! -e $WINDOW_LOCK ]] || die "a window already holds the runtime: $(<"$WINDOW_LOCK")"
    ( set -C; printf '%s (opened %s, from %s)\n' "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PWD" > "$WINDOW_LOCK" ) \
      || die "could not open the window: $WINDOW_LOCK was not written"
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

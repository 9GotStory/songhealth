#!/usr/bin/env bash
# Songhealth development runtime — a WINDOW holds the runtime while its data is taken away and
# brought back (#178 retro), so that no other session runs a suite or promotes a commit into it:
# dev-runtime-env.sh and dev-runtime-update.sh refuse from then on, while the lock exists; it cannot
# see a suite already running. The steps are in docs/operations/development-quadlet.md "A window".
# It coordinates sessions: it is no access control. A window names the UTC time its holder agreed
# with the Product Owner to close it, and status says when that time has passed (#238 retro: one
# stayed open 19 hours while a person reviewed, and another session's suite waited on it). Each
# open and close is a line in RUNTIME_EVENTS.
# The lock holds why the window opened, when, the directory it was opened from, where the
# holder's checkout and its scripts are (#240 retro), and its close time, last, where status reads
# it.
#   scripts/dev-runtime-window.sh open "<why>" <until, UTC, such as 2026-11-11T12:00Z>
#   scripts/dev-runtime-window.sh close
#   scripts/dev-runtime-window.sh status   # exit 0 with no window open, 1 with one
set -Eeuo pipefail
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

USAGE="usage: ${0##*/} open <why> <until, UTC, such as 2026-11-11T12:00Z> | close | status"
case ${1-} in
  open)
    (( $# == 3 )) && [[ -n $2 ]] || die "$USAGE"
    until_s=$(date -u -d "$3" +%s 2>/dev/null) || die "not a time: $3 ($USAGE)"
    (( until_s > $(date -u +%s) )) || die "the close time has passed already: $3"
    # A Thai-locale `date` writes the Buddhist year, 543 years ahead (#238 retro).
    (( until_s <= $(date -u +%s) + 7 * 86400 )) || die "the close time is more than a week away: $3"
    [[ ! -e $WINDOW_LOCK ]] || die "a window already holds the runtime: $(<"$WINDOW_LOCK")"
    ( set -C; printf '%s (opened %s, from %s, until %s)\n' "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      "$PWD" "$(date -u -d "@$until_s" +%Y-%m-%dT%H:%M:%SZ)" > "$WINDOW_LOCK" ) \
      || die "could not open the window: $WINDOW_LOCK was not written"
    log_event "opened a window: $(<"$WINDOW_LOCK")"
    note "the window is open: scripts/dev-runtime-env.sh --in-window runs commands inside it"
    ;;
  close)
    (( $# == 1 )) || die "$USAGE"
    if [[ -e $WINDOW_LOCK ]]; then
      log_event "closed the window: $(<"$WINDOW_LOCK")"
      rm -f "$WINDOW_LOCK"
    fi
    note "no window holds the runtime"
    ;;
  status)
    (( $# == 1 )) || die "$USAGE"
    last_event
    [[ -e $WINDOW_LOCK ]] || { note "no window holds the runtime"; exit 0; }
    note "a window holds the runtime: $(<"$WINDOW_LOCK")"
    if [[ $(<"$WINDOW_LOCK") =~ until\ ([0-9T:Z-]+)\)$ ]] \
      && (( $(date -u -d "${BASH_REMATCH[1]}" +%s) < $(date -u +%s) )); then
      warn "its close time ${BASH_REMATCH[1]} has passed: ask the Product Owner whether to close it"
    fi
    exit 1
    ;;
  *) die "$USAGE" ;;
esac

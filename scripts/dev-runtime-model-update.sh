#!/usr/bin/env bash
# Songhealth development runtime — MODEL UPDATE (#53): brings the runtime's database to the
# content model of the promoted commit's seed through EmDash's native schema API
# (scripts/model-update.mjs, run in the app container on its pinned Node, with the development
# PAT on standard input; the PAT is never printed). The step checks first. When changes are
# pending, it backs up the database and media, applies them and runs verify. With nothing
# pending it changes nothing and takes no backup, so it is safe to run again.
#   scripts/dev-runtime-model-update.sh
# Contract: docs/operations/development-quadlet.md.
set -Eeuo pipefail
set +a
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

(( $# == 0 )) || die "usage: ${0##*/}"
[[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
[[ -s $STATE_DIR/dev-pat && $(stat -c %a "$STATE_DIR/dev-pat") == 600 ]] \
  || die "the development PAT $STATE_DIR/dev-pat is missing or not mode 0600"

model_update() {
  podman exec -i "$APP_CTR" node /src/scripts/model-update.mjs --origin "$ORIGIN" "$@" \
    < "$STATE_DIR/dev-pat"
}

pending=0
model_update --check || pending=$?
case $pending in
  0) ;;
  3)
    backup=$STATE_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)
    install -d -m 0700 -- "$STATE_DIR/backups" "$backup"
    "$SRC/scripts/dev-runtime-backup.sh" "$backup" || die "backup failed: nothing was changed"
    note "backup written to $backup"
    model_update \
      || die "the model update stopped partway: run it again, or restore $backup (docs/operations/development-quadlet.md)"
    ;;
  *) die "the model check failed: nothing was changed" ;;
esac
"$SRC/scripts/dev-runtime-verify.sh" || die "verification failed: see the FAIL lines above"

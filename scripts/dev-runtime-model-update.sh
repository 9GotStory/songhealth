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

check_status=0
model_update --check || check_status=$?
case $check_status in
  0) ;;
  "$MODEL_PENDING")
    backup_runtime
    model_update \
      || die "the model update stopped partway: run it again, or restore $BACKUP_DIR (docs/operations/development-quadlet.md)"
    ;;
  *) die "the model check failed: nothing was changed" ;;
esac
"$SRC/scripts/dev-runtime-verify.sh" || die "verification failed: see the FAIL lines above"

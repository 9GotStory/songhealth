#!/usr/bin/env bash
# Songhealth development runtime — UPDATE: promote another commit to the running runtime
# (Feature 002 T036). Backs up the database and media first, stops the app, moves the
# runtime checkout to the commit, then hands over to THAT commit's installer, which
# reinstalls dependencies only when the lockfile changed, refreshes changed units, starts
# the app (EmDash applies pending core migrations in development) and runs verify.
#   scripts/dev-runtime-update.sh --sha <40-hex commit> [--no-backup]
# Rolling back after new EmDash migrations ran means restoring the backup taken here, after
# pointing the checkout back at the backup's commit (docs/operations/development-quadlet.md).
set -Eeuo pipefail
set +a
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

SHA='' BACKUP=yes
while (( $# )); do
  case $1 in
    --sha) (( $# >= 2 )) || die "usage: ${0##*/} --sha <40-hex commit> [--no-backup]"; SHA=$2; shift 2 ;;
    --no-backup) BACKUP=no; shift ;;
    *) die "usage: ${0##*/} --sha <40-hex commit> [--no-backup]" ;;
  esac
done
require_sha "$SHA"
[[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
[[ -d $SRC/.git && -f $UNIT_DIR/songhealth-dev-app.container ]] \
  || die "the runtime is not installed: use scripts/dev-runtime-install.sh --sha <commit>"
[[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]] \
  || die "$SRC has modified tracked files: make changes in your workspace and commit them instead"
git -C "$SRC" fetch --quiet origin
git -C "$SRC" cat-file -e "$SHA^{commit}" 2>/dev/null \
  || die "commit $SHA is not on a branch of the repository: commit it in the workspace first"
git -C "$SRC" cat-file -e "$SHA:scripts/dev-runtime-install.sh" 2>/dev/null \
  || die "commit $SHA predates this development runtime (no scripts/dev-runtime-install.sh)"

if [[ $BACKUP == yes ]]; then
  backup=$STATE_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)
  install -d -m 0700 -- "$STATE_DIR/backups" "$backup"
  "$SRC/scripts/dev-runtime-backup.sh" "$backup" || die "backup failed: nothing was changed"
  note "backup written to $backup"
fi
note "stopping $APP"
systemctl --user stop "$APP"
git -C "$SRC" checkout --quiet --detach "$SHA"
printf '%s\n' "$SHA" > "$SRC/$MARKER.tmp"
mv -f -- "$SRC/$MARKER.tmp" "$SRC/$MARKER"
note "runtime checkout moved to $SHA; continuing with that commit's installer"
exec "$SRC/scripts/dev-runtime-install.sh" --sha "$SHA"

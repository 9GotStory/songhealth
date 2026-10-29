#!/usr/bin/env bash
# Songhealth development runtime — UPDATE: promote another commit to the running runtime
# (Feature 002 T036). Backs up the database and media first, stops the app, moves the
# runtime checkout to the commit, then hands over to THAT commit's installer, which
# reinstalls dependencies only when the lockfile changed, refreshes changed units, starts
# the app (EmDash applies pending core migrations in development) and runs verify.
#   scripts/dev-runtime-update.sh --sha <40-hex commit> [--no-backup] [--force]
# The restart would cut off someone editing in the Admin, so the update refuses while an Admin
# page was opened in the last 10 minutes; --force overrides once those loads are known to be a
# test run's.
# Rolling back after new EmDash migrations ran means restoring the backup taken here, after
# pointing the checkout back at the backup's commit (docs/operations/development-quadlet.md).
set -Eeuo pipefail
set +a
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

SHA='' BACKUP=yes FORCE=no
USAGE="usage: ${0##*/} --sha <40-hex commit> [--no-backup] [--force]"
while (( $# )); do
  case $1 in
    --sha) (( $# >= 2 )) || die "$USAGE"; SHA=$2; shift 2 ;;
    --no-backup) BACKUP=no; shift ;;
    --force) FORCE=yes; shift ;;
    *) die "$USAGE" ;;
  esac
done
require_sha "$SHA"
[[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
[[ -d $SRC/.git && -f $UNIT_DIR/songhealth-dev-app.container ]] \
  || die "the runtime is not installed: use scripts/dev-runtime-install.sh --sha <commit>"
[[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]] \
  || die "$SRC has modified tracked files: make changes in your workspace and commit them instead"
if [[ $FORCE == no ]]; then
  recent=$(admin_page_loads)
  [[ -z $recent ]] || die "an Admin page was opened in the last $ADMIN_QUIET_MINUTES minutes:
$recent
wait until nobody is editing, or pass --force when these loads are a test run's"
fi
git -C "$SRC" fetch --quiet origin
git -C "$SRC" cat-file -e "$SHA^{commit}" 2>/dev/null \
  || die "commit $SHA is not on a branch of the repository: commit it in the workspace first"
git -C "$SRC" cat-file -e "$SHA:scripts/dev-runtime-install.sh" 2>/dev/null \
  || die "commit $SHA predates this development runtime (no scripts/dev-runtime-install.sh)"

if [[ $BACKUP == yes ]]; then
  backup_runtime
fi
note "stopping $APP"
systemctl --user stop "$APP"
git -C "$SRC" checkout --quiet --detach "$SHA"
printf '%s\n' "$SHA" > "$SRC/$MARKER.tmp"
mv -f -- "$SRC/$MARKER.tmp" "$SRC/$MARKER"
note "runtime checkout moved to $SHA; continuing with that commit's installer"
exec "$SRC/scripts/dev-runtime-install.sh" --sha "$SHA"

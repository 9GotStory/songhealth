#!/usr/bin/env bash
# Songhealth development runtime — UPDATE: promote another commit to the running runtime
# (Feature 002 T036). Backs up the database and media first, stops the app, moves the
# runtime checkout to the commit, then hands over to THAT commit's installer, which
# reinstalls dependencies only when the lockfile changed, refreshes changed units, starts
# the app (EmDash applies pending core migrations in development) and runs verify.
#   scripts/dev-runtime-update.sh --sha <commit> [--no-backup] [--replace] [--force | --wait]
# The commit may be abbreviated (7 or more hex digits); it is resolved after the fetch, and the
# installer and the runtime's marker get the full 40-hex SHA. The runtime checkout fetches from the
# workspace repository, so a commit made on GitHub, such as a pull request's merge, is fetched into
# a workspace branch first: git fetch origin <branch>:<branch> (#122 retro).
# The restart would cut off someone editing in the Admin, so the update refuses while an Admin
# page was opened in the last 10 minutes, leaving out the browser suites' own Admin sessions
# (dev-runtime-common.sh admin_page_loads); --force overrides once the listed loads are known to
# be your own, and --wait lists them, then waits until that quiet spell has passed and goes on
# (#146 retro: a hand-written wait loop that read the guard's wording never ended).
# A commit that does not contain the one the runtime serves would take away another line of work,
# such as another feature's branch under test, so the update refuses it unless given --replace
# (#177 retro). It checks this before it waits for the Admin, so that --wait never waits only to be
# refused, and again after the wait, since another promotion can land during it.
# Rolling back after new EmDash migrations ran means restoring the backup taken here, after
# pointing the checkout back at the backup's commit (docs/operations/development-quadlet.md).
set -Eeuo pipefail
set +a
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

require_contains_served() { # stops unless SHA contains the commit the runtime serves, or --replace
  [[ $REPLACE == no ]] || return 0
  local status=0
  git -C "$SRC" merge-base --is-ancestor HEAD "$SHA" || status=$?
  case $status in
    0) ;;
    1) die "the runtime serves $(git -C "$SRC" log -1 --format='%h %s' HEAD), and $SHA does not contain it:
this would take away that work. Once it no longer needs the runtime, pass --replace" ;;
    *) die "could not compare $SHA with the commit the runtime serves (git exit $status)" ;;
  esac
}

SHA='' BACKUP=yes FORCE=no WAIT=no REPLACE=no
USAGE="usage: ${0##*/} --sha <commit> [--no-backup] [--replace] [--force | --wait]"
while (( $# )); do
  case $1 in
    --sha) (( $# >= 2 )) || die "$USAGE"; SHA=$2; shift 2 ;;
    --no-backup) BACKUP=no; shift ;;
    --replace) REPLACE=yes; shift ;;
    --force) FORCE=yes; shift ;;
    --wait) WAIT=yes; shift ;;
    *) die "$USAGE" ;;
  esac
done
[[ $SHA =~ ^[0-9a-f]{7,40}$ ]] || die "--sha must name a commit: 7 to 40 hex digits"
[[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
[[ -d $SRC/.git && -f $UNIT_DIR/songhealth-dev-app.container ]] \
  || die "the runtime is not installed: use scripts/dev-runtime-install.sh --sha <commit>"
[[ -z $(git -C "$SRC" status --porcelain --untracked-files=no) ]] \
  || die "$SRC has modified tracked files: make changes in your workspace and commit them instead"
[[ $FORCE == no || $WAIT == no ]] || die "$USAGE"
git -C "$SRC" fetch --quiet origin
full=$(git -C "$SRC" rev-parse --verify --quiet "$SHA^{commit}") \
  || die "commit $SHA is not on a branch of the workspace repository, or names more than one commit:
commit it in the workspace first, fetch a commit made on GitHub into a workspace branch
(git fetch origin <branch>:<branch>), or give more digits"
SHA=$full
require_sha "$SHA"
git -C "$SRC" cat-file -e "$SHA:scripts/dev-runtime-install.sh" 2>/dev/null \
  || die "commit $SHA predates this development runtime (no scripts/dev-runtime-install.sh)"
require_contains_served
if [[ $FORCE == no ]]; then
  recent=$(admin_page_loads)
  if [[ -n $recent && $WAIT == yes ]]; then
    note "waiting until no Admin page has been opened for $ADMIN_QUIET_MINUTES minutes:
$recent"
    while [[ -n $(admin_page_loads) ]]; do sleep 60; done
    note "no Admin page opened in the last $ADMIN_QUIET_MINUTES minutes: going on"
    recent=''
  fi
  [[ -z $recent ]] || die "an Admin page was opened in the last $ADMIN_QUIET_MINUTES minutes:
$recent
wait until nobody is editing (--wait does it), or pass --force when these loads are your own"
  require_contains_served
fi

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

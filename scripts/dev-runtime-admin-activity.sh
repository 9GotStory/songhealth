#!/usr/bin/env bash
# Songhealth development runtime — ADMIN ACTIVITY (#54 retro): a read-only list of the Admin pages
# opened in the last 10 minutes, with the filter dev-runtime-update.sh's guard uses, which leaves
# out verify's own probe of the Admin. Run it before any restart the update script does not make.
#   scripts/dev-runtime-admin-activity.sh
# Exit status 0: nobody opened the Admin, so a restart cuts no one off. 1: the loads are listed;
# wait, unless they are a test run's own.
# shellcheck source=scripts/dev-runtime-common.sh
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

recent=$(admin_page_loads)
if [[ -n $recent ]]; then
  printf 'Admin pages opened in the last %s minutes:\n%s\n' "$ADMIN_QUIET_MINUTES" "$recent"
  exit 1
fi
echo "no Admin page opened in the last $ADMIN_QUIET_MINUTES minutes"

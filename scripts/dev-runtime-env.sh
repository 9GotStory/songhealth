#!/usr/bin/env bash
# Songhealth development runtime — run a command with the test variables (#57 retro): the runtime
# origin and the paths of the credential files in ~/.local/state/songhealth-qdev
# (dev-runtime-common.sh STATE_DIR). Only paths are set; the tests read the files, and nothing is
# printed. A variable already set in the environment, even to empty, wins. The command runs only on
# the Node package.json engines pins (scripts/check-node.sh, #65 retro). It refuses while a window
# holds the runtime (scripts/dev-runtime-window.sh), unless given --in-window by the window's holder.
#   scripts/dev-runtime-env.sh npm run test:browser -- tests/browser/<suite>.spec.ts
#   scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs
#   scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>
set -euo pipefail
state=$HOME/.local/state/songhealth-qdev
# $state/window is dev-runtime-common.sh's WINDOW_LOCK.
if [[ ${1-} == --in-window ]]; then
  shift
elif [[ -e $state/window ]]; then
  echo "dev-runtime-env.sh: a window holds the runtime: $(<"$state/window")" >&2
  echo "wait until it closes (scripts/dev-runtime-window.sh status)" >&2
  exit 1
fi
(($#)) || { echo "usage: scripts/dev-runtime-env.sh [--in-window] <command> [argument...]" >&2; exit 2; }
export PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL-http://127.0.0.1:4324}
export SONGHEALTH_DEV_ACCESS=${SONGHEALTH_DEV_ACCESS-$state/dev-pat}
export SONGHEALTH_ROLE_FIXTURE_ACCESS=${SONGHEALTH_ROLE_FIXTURE_ACCESS-$state/role-fixture-pat}
export SONGHEALTH_T021_ROUTE_ACCESS=${SONGHEALTH_T021_ROUTE_ACCESS-$state/t021-route-access.json}
export SONGHEALTH_ADMIN_SESSION=${SONGHEALTH_ADMIN_SESSION-dev-bypass}
export SONGHEALTH_ADMIN_TEST_SESSIONS=${SONGHEALTH_ADMIN_TEST_SESSIONS-$state/admin-test-sessions}
"$(dirname "${BASH_SOURCE[0]}")/check-node.sh"
exec "$@"

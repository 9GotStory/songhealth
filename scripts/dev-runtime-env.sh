#!/usr/bin/env bash
# Songhealth development runtime — run a command with the test variables (#57 retro): the runtime
# origin and the paths of the credential files in ~/.local/state/songhealth-qdev
# (dev-runtime-common.sh STATE_DIR). Only paths are set; the tests read the files, and nothing is
# printed. A variable already set in the environment, even to empty, wins.
#   scripts/dev-runtime-env.sh npm run test:browser -- tests/browser/<suite>.spec.ts --workers=1
#   scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs
#   scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>
set -euo pipefail
(($#)) || { echo "usage: scripts/dev-runtime-env.sh <command> [argument...]" >&2; exit 2; }
state=$HOME/.local/state/songhealth-qdev
export PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL-http://127.0.0.1:4324}
export SONGHEALTH_DEV_ACCESS=${SONGHEALTH_DEV_ACCESS-$state/dev-pat}
export SONGHEALTH_ROLE_FIXTURE_ACCESS=${SONGHEALTH_ROLE_FIXTURE_ACCESS-$state/role-fixture-pat}
export SONGHEALTH_T021_ROUTE_ACCESS=${SONGHEALTH_T021_ROUTE_ACCESS-$state/t021-route-access.json}
export SONGHEALTH_ADMIN_SESSION=${SONGHEALTH_ADMIN_SESSION-dev-bypass}
exec "$@"

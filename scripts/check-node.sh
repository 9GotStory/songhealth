#!/usr/bin/env bash
# Songhealth toolchain check (#65 retro): exit 1 while the running Node is outside the major line
# that package.json engines pins, as the T021 coordinator refuses to (tests/browser/
# run-cms-public-reads.mjs). The pre-commit hook and scripts/dev-runtime-env.sh run it first, so
# neither a commit's checks nor any runtime evidence runs on another Node.
#   scripts/check-node.sh
set -euo pipefail
package=$(dirname "${BASH_SOURCE[0]}")/../package.json
pinned=$(node -p 'require(process.argv[1]).engines.node' "$(realpath "$package")")
running=$(node -p 'process.versions.node')
if [[ ${running%%.*} != "${pinned%%.*}" ]]; then
  echo "check-node: running Node $running, outside the pinned ${pinned%%.*}.x line (package.json engines $pinned): switch to Node $pinned first" >&2
  exit 1
fi

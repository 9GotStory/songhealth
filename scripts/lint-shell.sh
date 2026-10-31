#!/usr/bin/env bash
# ShellCheck for the development-runtime scripts and the pre-commit hook, on a digest-pinned
# ShellCheck 0.11.0 image so that CI (docker) and the workstation (podman) run the same version.
# The container gets no network and a read-only view of the repository. The accepted Feature 001
# scripts join the list when a change touches them.
#   npm run lint:shell
set -euo pipefail
IMAGE=docker.io/koalaman/shellcheck:v0.11.0@sha256:61862eba1fcf09a484ebcc6feea46f1782532571a34ed51fedf90dd25f925a8d
cd "$(dirname "${BASH_SOURCE[0]}")/.."
engine=$(command -v podman || command -v docker) || { echo "lint-shell: needs podman or docker" >&2; exit 2; }
files=(scripts/dev-runtime-*.sh scripts/evidence-branch.sh scripts/lint-shell.sh scripts/check-node.sh
  deploy/dev-quadlet/initdb/*.sh .githooks/pre-commit)
exec "$engine" run --rm --network none --security-opt label=disable -v "$PWD:/mnt:ro" -w /mnt \
  "$IMAGE" -x "${files[@]}"

#!/usr/bin/env bash
# Node for Songhealth's operational scripts on the Production host (Feature 016, #456; spec #450
# "The Production host and the host contract"): the version package.json pins, installed under the
# Deployment account from the official distribution with its checksum verified. Run as that
# account, never as root. No dependency and no development toolchain is installed: no npm package,
# no compiler, nothing from the distribution's archive.
#
#   bash install-node.sh <version>     e.g. 26.13.0, the value of package.json "engines.node"
#
# It installs into ~/.local/opt/node-v<version>-linux-x64 and points ~/.local/bin/node at it. The
# official archive also carries npm, npx, corepack and the C headers for native addons; they are
# removed, so the runtime alone stays (spec #450: no dependency and no toolchain on the host).
set -euo pipefail

version=${1:-}
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "usage: install-node.sh <x.y.z>" >&2; exit 2; }
[[ $(id -u) != 0 ]] || { echo "install-node: run as the Deployment account, not root" >&2; exit 1; }
[[ $(uname -m) == x86_64 ]] || { echo "install-node: written for x86_64" >&2; exit 1; }

name=node-v$version-linux-x64
base=https://nodejs.org/dist/v$version
opt=$HOME/.local/opt
target=$opt/$name

if [[ -x $target/bin/node ]]; then
  echo "install-node: $target exists"
else
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  curl -fsS --retry 3 -o "$work/SHASUMS256.txt" "$base/SHASUMS256.txt"
  curl -fsS --retry 3 -o "$work/$name.tar.xz" "$base/$name.tar.xz"
  # The official checksum list names the archive once; sha256sum refuses a missing or wrong file.
  (cd "$work" && grep "  $name.tar.xz\$" SHASUMS256.txt | sha256sum -c -)
  mkdir -p "$opt"
  tar -xJf "$work/$name.tar.xz" -C "$opt"
fi
rm -rf "$target/bin/npm" "$target/bin/npx" "$target/bin/corepack" "$target/lib/node_modules" "$target/include"
mkdir -p "$HOME/.local/bin"
ln -sfn "$target/bin/node" "$HOME/.local/bin/node"
"$HOME/.local/bin/node" --version

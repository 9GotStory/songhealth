#!/usr/bin/env bash
# Pull-request screenshots on an image-only branch (#61 retro): commit every PNG in <dir> at the
# root of a commit on the local branch evidence/<ticket>-screenshots, and print the push command
# and the address to embed each image by. The branch keeps no code. A new capture for the same
# ticket becomes a child commit, so earlier screenshots stay reachable. The push is left to you:
# it publishes the images, and the repository is public.
#   scripts/evidence-branch.sh <ticket, such as 003-61> <dir of PNGs>
set -euo pipefail
(($# == 2)) || { echo "usage: scripts/evidence-branch.sh <ticket> <dir of PNGs>" >&2; exit 2; }
ticket=$1 dir=$2
[[ $ticket =~ ^[0-9]{3}-[0-9]+$ ]] || { echo "evidence-branch: the ticket looks like 003-61" >&2; exit 2; }
shopt -s nullglob
images=("$dir"/*.png)
((${#images[@]})) || { echo "evidence-branch: no PNG in $dir" >&2; exit 1; }

branch=evidence/$ticket-screenshots
tree=$(for image in "${images[@]}"; do
  printf '100644 blob %s\t%s\n' "$(git hash-object -w "$image")" "${image##*/}"
done | git mktree)
parent=()
if git rev-parse --verify -q "refs/heads/$branch" >/dev/null; then parent=(-p "$branch"); fi
commit=$(git commit-tree "$tree" "${parent[@]}" -m "evidence: #${ticket#*-} screenshots at $(git rev-parse --short HEAD)")
git branch -f "$branch" "$commit"

repository=$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
echo "evidence-branch: ${#images[@]} images on $branch at $commit"
echo "push:  git push origin $branch"
echo "embed: https://github.com/$repository/blob/$commit/<file>?raw=true"

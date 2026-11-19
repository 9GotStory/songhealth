#!/usr/bin/env bash
# Pull-request screenshots on an image-only branch (#61 retro): commit every PNG in <dir> at the
# root of a commit on the local branch evidence/<ticket>-screenshots, and print the push command,
# the address to embed each image by, and a table row for each before-<name>.png with its
# after-<name>.png (#196 retro). The branch keeps no code. A new capture for the same ticket
# becomes a child commit, so earlier screenshots stay reachable; a folder of after images alone
# takes their before images from the branch's tip. The commit also holds <dir>'s
# captures.txt, when scripts/capture-screenshots.mjs wrote one, so the branch keeps each image's
# path (#282 retro). It ends with the table of the pages' heights that scripts/evidence-heights.ts
# reads from the PNGs, for a pull request or a record to quote whole (#287 retro). The push is left
# to you: it publishes the images, and the repository is public.
#   scripts/evidence-branch.sh <ticket: 003-61, or 169 for a standalone one> <dir of PNGs>
set -euo pipefail
(($# == 2)) || { echo "usage: scripts/evidence-branch.sh <ticket> <dir of PNGs>" >&2; exit 2; }
ticket=$1 dir=$2
[[ $ticket =~ ^([0-9]{3}-)?[0-9]+$ ]] || { echo "evidence-branch: the ticket looks like 003-61 or 169" >&2; exit 2; }
# A ticket built on a feature's branch takes the feature's number, as its branch does (#344 retro:
# "344" on feat/011-344-service-page made evidence/344-screenshots beside Feature 011's).
current=$(git branch --show-current)
if [[ $ticket =~ ^[0-9]+$ && $current =~ ^[a-z]+/([0-9]{3})-$ticket- ]]; then
  echo "evidence-branch: $current is Feature ${BASH_REMATCH[1]}'s; use ${BASH_REMATCH[1]}-$ticket" >&2
  exit 2
fi
shopt -s nullglob
images=("$dir"/*.png)
((${#images[@]})) || { echo "evidence-branch: no PNG in $dir" >&2; exit 1; }

branch=evidence/$ticket-screenshots
# An after-<name>.png whose before-<name>.png is not in <dir> takes the one at the branch's tip, so
# a folder of after images alone still commits and prints its pairs (#339 retro: the after-only
# commit 63c77c2 dropped the 100 before images from the tip and printed no pair).
if git rev-parse --verify -q "refs/heads/$branch" >/dev/null; then
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  cp "$dir"/*.png "$work"/
  [[ -e $dir/captures.txt ]] && cp "$dir/captures.txt" "$work/captures.txt"
  carried=0
  for after in "$work"/after-*.png; do
    before=before-${after##*/after-}
    [[ -e $work/$before ]] && continue
    git cat-file -e "$branch:$before" 2>/dev/null || continue
    git cat-file blob "$branch:$before" >"$work/$before"
    if git cat-file -e "$branch:captures.txt" 2>/dev/null; then
      git cat-file blob "$branch:captures.txt" | grep -F "$before"$'\t' >>"$work/captures.txt" || true
    fi
    carried=$((carried + 1))
  done
  if ((carried)); then
    echo "evidence-branch: $carried before images carried from $branch's tip"
    dir=$work
    images=("$dir"/*.png)
  fi
fi
# A folder of after images whose before images neither it nor the branch's tip holds would commit
# without a pair to print (#345 retro: a ticket's first after-only run on a new branch was pushed
# that way): it stops here, before any commit. A new page's after image beside pairs still commits.
afters=("$dir"/after-*.png)
pairs=0
for after in "${afters[@]}"; do
  [[ -e $dir/before-${after##*/after-} ]] && pairs=$((pairs + 1))
done
if ((${#afters[@]} && !pairs)); then
  echo "evidence-branch: no before image for any of the ${#afters[@]} after images in $dir or at $branch's tip; put the before images in $dir" >&2
  exit 1
fi
files=("${images[@]}")
if [[ -e $dir/captures.txt ]]; then files+=("$dir/captures.txt"); fi
tree=$(for file in "${files[@]}"; do
  printf '100644 blob %s\t%s\n' "$(git hash-object -w "$file")" "${file##*/}"
done | git mktree)
parent=()
if git rev-parse --verify -q "refs/heads/$branch" >/dev/null; then parent=(-p "$branch"); fi
commit=$(git commit-tree "$tree" "${parent[@]}" -m "evidence: #${ticket#*-} screenshots at $(git rev-parse --short HEAD)")
git branch -f "$branch" "$commit"

repository=$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
address=https://github.com/$repository/blob/$commit
echo "evidence-branch: ${#images[@]} images on $branch at $commit"
echo "push:  git push origin $branch"
echo "embed: $address/<file>?raw=true"
for before in "$dir"/before-*.png; do
  name=${before##*/before-}
  [[ -e $dir/after-$name ]] || continue
  echo "| ${name%.png} | ![Before: ${name%.png}]($address/before-$name?raw=true) | ![After: ${name%.png}]($address/after-$name?raw=true) |"
done
echo "heights (px):"
node "$(dirname "${BASH_SOURCE[0]}")/evidence-heights.ts" "$dir"

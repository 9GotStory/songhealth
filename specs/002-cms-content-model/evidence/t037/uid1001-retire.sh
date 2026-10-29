#!/usr/bin/env bash
# T037 — RETIRE every Songhealth runtime of UID 1001 (multica-agent). Product Owner decision
# 2026-10-29 ("(a)+(b) songhealth ทั้งหมด", no backup):
#   (a) the controller-managed development runtime at 127.0.0.1:4322: containers, volumes,
#       networks and tooling image, the Runtime Controller, the stable source and its git store;
#   (b) the production-foundation Quadlet stack at 127.0.0.1:4321: units, environment files,
#       containers, volumes, network, podman secrets and the songhealth-app images;
#   and the account's other Songhealth leftovers: the superseded native-host dev-db container
#   (scripts/dev-db.sh), Songhealth caches, and the projects/songhealth checkout when git
#   confirms it holds nothing that is not on GitHub.
# Other workloads (s2-assets, Multica, Codex, unrelated containers) are never touched: a volume,
# network or image is removed only when no container outside this plan uses it, and git data
# only when git confirms nothing would be lost. Everything uncertain is kept and listed.
#   plan    (default) read-only: print exactly what `delete` removes; prints no secret
#   delete  remove exactly that plan after the typed confirmation "delete songhealth uid1001"
# Run it as multica-agent with that user's session environment (the Product Owner runs it;
# the local workspace user has no access to UID 1001):
#   sudo -H -u multica-agent env XDG_RUNTIME_DIR=/run/user/1001 \
#     DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1001/bus \
#     bash -s -- plan < specs/002-cms-content-model/evidence/t037/uid1001-retire.sh \
#     2>&1 | tee /tmp/songhealth-uid1001-plan.txt
set -uo pipefail
export LC_ALL=C
MODE=${1:-plan}
case $MODE in plan|delete) ;; *) echo "usage: bash -s -- plan|delete" >&2; exit 2 ;; esac
[[ $(id -un) == multica-agent && $HOME == /home/multica-agent ]] \
  || { echo "run as multica-agent with HOME=/home/multica-agent (sudo -H -u multica-agent ...)" >&2; exit 1; }
cd "$HOME" || exit 1

CONTAINERS=(songhealth-dev-app songhealth-dev-postgres systemd-songhealth-app systemd-songhealth-db
  songhealth-dev-db)                                     # the last one: scripts/dev-db.sh
QUADLET_DIR=$HOME/.config/containers/systemd
# (a)'s Runtime Controller and stable source; the stable source is a worktree of STORE.
RUNTIME_DIRS=("$HOME/.local/share/dev-runtimes/songhealth" "$HOME/projects/songhealth-dev")
STORE=$HOME/projects/.songhealth-dev.git
CHECKOUT=$HOME/projects/songhealth
IMAGE_REPOS=(localhost/songhealth-app localhost/songhealth-dev-tooling)   # every tag of each

in_list() { local x=$1 y; shift; for y in "$@"; do [[ $x == "$y" ]] && return 0; done; return 1; }
foreign_users() { # foreign_users PS-FILTER — containers outside this plan that match the filter
  local names n                                          # fail closed: unknown users keep the item
  names=$(podman ps -a --filter "$1" --format '{{.Names}}') || { printf 'UNKNOWN(podman ps failed) '; return; }
  while IFS= read -r n; do
    [[ -z $n ]] || in_list "$n" "${CONTAINERS[@]}" || printf '%s ' "$n"
  done <<< "$names"
}
image_name() {
  podman image inspect --format '{{if .RepoTags}}{{index .RepoTags 0}}{{else if .RepoDigests}}{{index .RepoDigests 0}}{{else}}{{.Id}}{{end}}' "$1" 2>/dev/null
}
git_store_ok() { # git_store_ok DIR — the store serves no worktree besides the stable source
  local list others                                      # whole outputs: no early-exit pipe reader
  list=$(git --git-dir="$1" worktree list --porcelain 2>/dev/null) || return 1
  others=$(sed -n 's/^worktree //p' <<< "$list" | grep -vxF -e "$1" -e "$HOME/projects/songhealth-dev")
  [[ -z $others ]]
}
checkout_state() { # checkout_state DIR — "modified=N unpushed=N stashes=N worktrees=N", or fail
  local d=$1 s u t w
  [[ -d $d/.git ]] || return 1                           # not a standalone checkout: keep it
  s=$(git -C "$d" status --porcelain 2>/dev/null) || return 1
  u=$(git -C "$d" log --branches HEAD --not --remotes --format=%h 2>/dev/null) || return 1
  t=$(git -C "$d" stash list 2>/dev/null) || return 1
  w=$(git -C "$d" worktree list --porcelain 2>/dev/null) || return 1
  printf 'modified=%s unpushed=%s stashes=%s worktrees=%s' "$(grep -c . <<< "$s")" \
    "$(grep -c . <<< "$u")" "$(grep -c . <<< "$t")" "$(grep -c '^worktree ' <<< "$w")"
}

# --- the plan -------------------------------------------------------------------------------
containers=() cand_volumes=(songhealth-db-data songhealth-media songhealth-dev-db-data)
cand_networks=(songhealth) cand_images=() volumes=() networks=() images=() secrets=() units=()
files=() dirs=() kept=() pods=() review=()
declare -A seen_image=() dir_note=()
for c in "${CONTAINERS[@]}"; do podman container exists "$c" && containers+=("$c"); done
while IFS= read -r p; do pods+=("$p"); done < <(podman pod ls --format '{{.Name}}' | grep -i songhealth)
for c in "${containers[@]}"; do
  while IFS= read -r v; do [[ -n $v ]] && cand_volumes+=("$v"); done \
    < <(podman inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{"\n"}}{{end}}{{end}}' "$c")
  while IFS= read -r n; do [[ -n $n ]] && cand_networks+=("$n"); done \
    < <(podman inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$c")
  cand_images+=("$(podman inspect --format '{{.Image}}' "$c")")
done
for r in "${IMAGE_REPOS[@]}"; do
  while IFS= read -r i; do [[ -n $i ]] && cand_images+=("$i"); done \
    < <(podman images --filter reference="$r" --format '{{.ID}}')
done
for v in $(printf '%s\n' "${cand_volumes[@]}" | sort -u); do
  podman volume exists "$v" || continue
  f=$(foreign_users "volume=$v")
  if [[ -n $f ]]; then kept+=("volume $v (also used by: $f)"); else volumes+=("$v"); fi
done
for n in $(printf '%s\n' "${cand_networks[@]}" | sort -u); do
  [[ $n == podman ]] && continue                         # the shared default network
  podman network exists "$n" || continue
  f=$(foreign_users "network=$n")
  if [[ -n $f ]]; then kept+=("network $n (also used by: $f)"); else networks+=("$n"); fi
done
for i in "${cand_images[@]}"; do                         # short and full IDs: one entry per image
  [[ -n $i ]] || continue
  id=$(podman image inspect --format '{{.Id}}' "$i" 2>/dev/null) || continue
  [[ -n ${seen_image[$id]:-} ]] && continue
  seen_image[$id]=1
  f=$(foreign_users "ancestor=$id")
  if [[ -n $f ]]; then kept+=("image $(image_name "$id") (also used by: $f)"); else images+=("$id"); fi
done
while IFS= read -r line; do                              # other Songhealth-named images: review only
  id=${line##* } id=${id#sha256:}
  [[ -n ${seen_image[$id]:-} ]] || review+=("image ${line% *}")
done < <(podman images --no-trunc --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -i songhealth)
while IFS= read -r s; do secrets+=("$s"); done < <(podman secret ls --format '{{.Name}}' | grep -E '^songhealth')
while IFS= read -r u; do units+=("$u"); done \
  < <(systemctl --user list-units --all --no-legend --plain '*songhealth*' | awk '{print $1}')
while IFS= read -r f; do files+=("$f"); done \
  < <(find "$QUADLET_DIR" "$HOME/.config/systemd/user" -maxdepth 2 -name '*songhealth*' 2>/dev/null | sort)
for d in "${RUNTIME_DIRS[@]}"; do [[ -d $d ]] && dirs+=("$d"); done
if [[ -d $STORE ]]; then
  if git_store_ok "$STORE"; then dirs+=("$STORE"); dir_note[$STORE]="git store of the stable source only"
  else kept+=("git store $STORE (git lists other worktrees, or could not tell)"); fi
fi
if [[ -e $CHECKOUT ]]; then
  if st=$(checkout_state "$CHECKOUT"); then
    if [[ $st == 'modified=0 unpushed=0 stashes=0 worktrees=1' ]]; then
      dirs+=("$CHECKOUT"); dir_note[$CHECKOUT]="git: nothing outside GitHub; $st"
    else review+=("$CHECKOUT (kept: git $st)"); fi
  else review+=("$CHECKOUT (kept: not a standalone git checkout, or git could not tell)"); fi
fi
while IFS= read -r d; do dirs+=("$d"); dir_note[$d]="cache"; done \
  < <(find "$HOME/.cache" -mindepth 1 -maxdepth 1 -type d -name '*songhealth*' 2>/dev/null | sort)
while IFS= read -r d; do in_list "$d" "${dirs[@]}" "$CHECKOUT" || review+=("$d"); done \
  < <(find "$HOME/projects" "$HOME/.local/share" "$HOME/.local/share/dev-runtimes" "$HOME/.local/state" \
        "$HOME/.config" "$HOME/.cache" -mindepth 1 -maxdepth 1 -name '*songhealth*' 2>/dev/null | sort -u)
cron=$( { crontab -l 2>/dev/null || :; } | grep -ci songhealth)

section() { printf '\n== %s (%s)\n' "$1" "$2"; }
show() { local x; [[ $# -eq 0 ]] && { echo "  (none)"; return; }; for x in "$@"; do echo "  $x"; done; }
echo "# UID-1001 Songhealth retirement ($MODE) $(date -u +%FT%TZ) as $(id -un) (uid $(id -u))"
section "containers to stop and remove" "${#containers[@]}"; show "${containers[@]}"
section "pods to remove" "${#pods[@]}"; show "${pods[@]}"
section "systemd user units to stop" "${#units[@]}"; show "${units[@]}"
section "unit, Quadlet and environment files to remove (names only)" "${#files[@]}"; show "${files[@]}"
section "volumes to remove (no other user)" "${#volumes[@]}"; show "${volumes[@]}"
section "networks to remove (no other user)" "${#networks[@]}"; show "${networks[@]}"
section "podman secrets to remove (names only)" "${#secrets[@]}"; show "${secrets[@]}"
section "images to remove, every tag (no other user)" "${#images[@]}"
for i in "${images[@]}"; do
  tags=$(podman image inspect --format '{{range .RepoTags}}{{.}} {{end}}' "$i" 2>/dev/null)
  echo "  ${tags:-$(image_name "$i") }(${i:0:12})"
done
[[ ${#images[@]} -eq 0 ]] && echo "  (none)"
section "directories to remove" "${#dirs[@]}"
for d in "${dirs[@]}"; do echo "  $d ($(du -sh "$d" 2>/dev/null | cut -f1)${dir_note[$d]:+; ${dir_note[$d]}})"; done
[[ ${#dirs[@]} -eq 0 ]] && echo "  (none)"
section "other Songhealth-named items: NOT removed, listed for review" "${#review[@]}"; show "${review[@]}"
section "kept because another workload uses them" "${#kept[@]}"; show "${kept[@]}"
section "crontab lines mentioning songhealth (not changed)" "$cron"
section "other containers of this account (untouched)" "listing"
podman ps -a --format '{{.Names}} | {{.Image}} | {{.Status}}' | while IFS= read -r line; do
  in_list "${line%% |*}" "${CONTAINERS[@]}" || echo "  $line"
done

if [[ $MODE == plan ]]; then
  printf '\n# plan only: nothing was changed. Re-run with "delete" to remove exactly the items above.\n'
  exit 0
fi

# --- delete ---------------------------------------------------------------------------------
printf '\nThis permanently deletes every item listed above. No backup is taken.\n'
printf 'Type "delete songhealth uid1001" to continue: '
IFS= read -r reply < /dev/tty || reply=
[[ $reply == 'delete songhealth uid1001' ]] || { echo "not confirmed: nothing was changed"; exit 1; }
failed=0
run() { if "$@"; then echo "  ok: $*"; else echo "  FAILED: $*"; failed=1; fi; }
remove_image() { # remove_image ID — untag every name (no --force), then the image if it remains
  local t
  while IFS= read -r t; do [[ -n $t ]] && run podman image rm "$t"; done \
    < <(podman image inspect --format '{{range .RepoTags}}{{.}}{{"\n"}}{{end}}' "$1" 2>/dev/null)
  if podman image exists "$1"; then run podman image rm "$1"; fi
}
echo "== stopping units"
for u in "${units[@]}"; do run systemctl --user stop "$u"; done
echo "== removing containers"
for c in "${containers[@]}"; do
  if podman container exists "$c"; then run podman rm --force --time 10 "$c"; fi
done
for p in "${pods[@]}"; do run podman pod rm --force "$p"; done
echo "== removing unit and environment files"
for f in "${files[@]}"; do run rm -rf -- "$f"; done
run systemctl --user daemon-reload
systemctl --user reset-failed 2>/dev/null || :
echo "== removing volumes, networks, secrets and images"
for v in "${volumes[@]}"; do run podman volume rm "$v"; done
for n in "${networks[@]}"; do run podman network rm "$n"; done
for s in "${secrets[@]}"; do run podman secret rm "$s"; done
for i in "${images[@]}"; do
  if [[ -z $(foreign_users "ancestor=$i") ]]; then remove_image "$i"; else echo "  kept (now in use): $i"; fi
done
echo "== removing directories (as the rootless user namespace's root, for files containers created)"
for d in "${dirs[@]}"; do
  case $d in "$HOME"/?*) run podman unshare rm -rf -- "$d" ;; *) echo "  FAILED: refusing $d (outside $HOME)"; failed=1 ;; esac
done

echo "== what remains"
echo "  containers: $(podman ps -a --format '{{.Names}}' | grep -cE '^(songhealth-dev-|systemd-songhealth-)')"
echo "  volumes:    $(for v in "${volumes[@]}"; do podman volume exists "$v" && echo "$v"; done | wc -l)"
echo "  networks:   $(for n in "${networks[@]}"; do podman network exists "$n" && echo "$n"; done | wc -l)"
echo "  secrets:    $(podman secret ls --format '{{.Name}}' | grep -cE '^songhealth')"
echo "  images:     $(for i in "${images[@]}"; do podman image exists "$i" && echo "$i"; done | wc -l)"
echo "  units:      $(systemctl --user list-units --all --no-legend --plain '*songhealth*' | wc -l)"
echo "  files/dirs: $(for p in "${files[@]}" "${dirs[@]}"; do [[ -e $p ]] && echo "$p"; done | wc -l)"
echo "  listening on 127.0.0.1:4321/4322: $(ss -Htln '( sport = :4321 or sport = :4322 )' | wc -l)"
if (( failed )); then echo "RETIRE: INCOMPLETE (see FAILED lines)"; exit 1; fi
echo "RETIRE: DONE"

#!/usr/bin/env bash
# T037 — READ-ONLY inventory of what UID 1001 (multica-agent) runs, before the Songhealth
# runtime there is deleted. Prints names, images, mounts, networks, ports, units and
# directories only: no file contents, no environment values, no secrets. Changes nothing.
# Run it as multica-agent with that user's session environment (the Product Owner runs it;
# the local workspace user has no access to UID 1001):
#   sudo -H -u multica-agent env XDG_RUNTIME_DIR=/run/user/1001 \
#     DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1001/bus \
#     bash -s < specs/002-cms-content-model/evidence/t037/uid1001-inventory.sh \
#     2>&1 | tee /tmp/songhealth-uid1001-inventory.txt
set -uo pipefail
export LC_ALL=C
cd "$HOME" || exit 1
section() { printf '\n== %s\n' "$*"; }

echo "# UID-1001 inventory $(date -u +%FT%TZ) as $(id -un) (uid $(id -u))"
section "containers: name | image | status | ports"
podman ps -a --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}'
section "container owners: compose project | systemd unit | runtime generation label"
for c in $(podman ps -a --format '{{.Names}}'); do
  podman inspect --format '{{.Name}} | compose={{index .Config.Labels "com.docker.compose.project"}}{{index .Config.Labels "io.podman.compose.project"}} | unit={{index .Config.Labels "PODMAN_SYSTEMD_UNIT"}} | generation={{index .Config.Labels "io.9gotstory.dev-runtime.generation"}}' "$c"
done
section "Songhealth containers: mounts, networks, restart policy"
for c in $(podman ps -a --format '{{.Names}}' | grep -i songhealth); do
  podman inspect --format '{{.Name}}{{range .Mounts}}{{"\n"}}  mount {{.Type}} {{if .Name}}{{.Name}}{{else}}{{.Source}}{{end}} -> {{.Destination}}{{end}}{{"\n"}}  networks:{{range $k, $v := .NetworkSettings.Networks}} {{$k}}{{end}}{{"\n"}}  restart: {{.HostConfig.RestartPolicy.Name}}' "$c"
done
section "volumes: name | used by"
for v in $(podman volume ls --format '{{.Name}}'); do
  printf '%s | %s\n' "$v" "$(podman ps -a --filter volume="$v" --format '{{.Names}}' | tr '\n' ' ')"
done
section "networks: name | driver"
podman network ls --format '{{.Name}} | {{.Driver}}'
section "podman secrets (names only)"
podman secret ls --format '{{.Name}}'
section "images: repository:tag | id | size"
podman images --format '{{.Repository}}:{{.Tag}} | {{.ID}} | {{.Size}}'
section "systemd user units mentioning songhealth (loaded, then unit files)"
systemctl --user list-units --all --no-legend --plain | grep -i songhealth
systemctl --user list-unit-files --no-legend | grep -i songhealth
section "unit and Quadlet directories"
ls -la ~/.config/systemd/user ~/.config/containers/systemd 2>&1
section "user timers"
systemctl --user list-timers --all --no-legend --plain
section "crontab lines mentioning songhealth (count only)"
{ crontab -l 2>/dev/null || :; } | grep -ci songhealth
section "Songhealth directories (names and sizes only)"
ls -la ~/.local/share/dev-runtimes ~/.local/share/dev-runtimes/songhealth ~/projects 2>&1
du -sh ~/.local/share/dev-runtimes/songhealth ~/projects/songhealth-dev 2>&1
section "processes outside containers (names only)"
# shellcheck disable=SC2009  # every process name of this user, minus container plumbing
ps -u "$(id -un)" -o comm= | grep -vxE 'catatonit|conmon|rootlessport|pasta(\.avx2)?|aardvark-dns' | sort | uniq -c
echo
echo "# inventory complete"

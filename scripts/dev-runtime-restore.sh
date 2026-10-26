#!/usr/bin/env bash
# Songhealth development Quadlet runtime — RESTORE (Phase 2 executor, DESTRUCTIVE
# to the qdev database/media ONLY). Guardrails: refuses by default; requires
# --confirm plus a second typed confirmation for each replacement; only ever
# touches the songhealth-qdev-* resources; never resets, prunes or recreates any
# other container/volume/network; refuses to restore onto a running service.
set -Euo pipefail
die() { echo "dev-runtime-restore: FAIL: $*" >&2; exit 1; }
usage() { die "usage: dev-runtime-restore.sh --confirm <dump-file> <media-tar>"; }
[[ "${1:-}" == "--confirm" ]] || usage
shift; DUMP="${1:-}"; MEDIA="${2:-}"; [[ -f "$DUMP" && -f "$MEDIA" ]] || usage
confirm() { local r; read -r -p "dev-runtime-restore: $1 [type yes]: " r; [[ "$r" == "yes" ]] || die "not confirmed; nothing changed"; }
podman container exists songhealth-qdev-db || die "db container missing (installation must exist first)"
STATE="$(systemctl --user is-active songhealth-dev-app.service 2>&1)" || true
[ "$STATE" = "active" ] && die "stop songhealth-dev-app.service before restore (it must not serve during replacement)"
case "$STATE" in inactive|failed) ;; *) die "cannot determine songhealth-dev-app.service state (got: $STATE): refusing destructive action";; esac
for v in songhealth-qdev-db-data songhealth-qdev-media; do
  podman volume inspect "$v" >/dev/null 2>&1 || die "expected volume $v not found: restore only touches the named qdev volumes"
  LB="$(podman volume inspect --format "{{index .Labels \"io.songhealth.runtime\"}}" "$v")"
  [ "$LB" = "qdev" ] || die "volume $v lacks the io.songhealth.runtime=qdev ownership label: refusing to touch it"
done
echo "This replaces the songhealth_qdev DATABASE content from: $DUMP"
confirm "replace database content?"
podman exec -i songhealth-qdev-db psql -U songhealth_qdev_admin -d songhealth_qdev -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' \
  || die "schema reset failed"
podman cp "$DUMP" songhealth-qdev-db:/tmp/restore.dump || die "could not stage dump"
podman exec songhealth-qdev-db pg_restore -U songhealth_qdev_admin -d songhealth_qdev --no-owner --exit-on-error /tmp/restore.dump \
  || { podman exec songhealth-qdev-db rm -f /tmp/restore.dump; die "pg_restore failed: database left in restored-partial state — do not restart the app without review"; }
podman exec songhealth-qdev-db rm -f /tmp/restore.dump || true
echo "This replaces the songhealth-qdev-media VOLUME content from: $MEDIA"
confirm "replace media content?"
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-qdev-media)"; [[ -n "$MP" ]] || die "media volume not inspectable"
confirm "ERASE current media volume contents (qdev only) and extract the tar?"
podman unshare find "$MP" -mindepth 1 -maxdepth 1 ! -name '.songhealth-qdev-media-store' -exec rm -rf -- {} + \
  || die "media clear failed"
podman unshare tar -xf "$MEDIA" -C "$MP" || die "media extract failed (marker preserved); inspect manually"
echo "dev-runtime-restore: restore sequence done. Verify with scripts/dev-runtime-verify.sh BEFORE restarting the app; restart is a separate explicit operator action."

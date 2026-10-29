#!/usr/bin/env bash
# Songhealth development runtime — UNINSTALL (Feature 002 T036, T037).
#   scripts/dev-runtime-uninstall.sh          stop the runtime and remove its units; keep the
#                                             data volumes, secrets, PAT, backups and checkout
#   scripts/dev-runtime-uninstall.sh --purge  ALSO delete the qdev database and media volumes,
#                                             secrets, network, PAT and T021 route token
#                                             (typed confirmation)
# Only the exact songhealth-qdev names below are touched. The source checkout and the
# backups under ~/.local/state/songhealth-qdev/backups are never deleted.
set -Eeuo pipefail
set +a
umask 077
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"
trap '[[ $BASH_SUBSHELL == 0 ]] && die "unexpected failure (line $LINENO): $BASH_COMMAND"' ERR

PURGE=no
case ${1:-} in
  "") ;;
  --purge) PURGE=yes ;;
  *) die "usage: ${0##*/} [--purge]" ;;
esac
[[ $(id -u) == 1000 ]] || die "the development runtime belongs to UID 1000"
if [[ $PURGE == yes ]]; then
  printf 'This permanently deletes the development database, media, secrets and PAT.\n'
  printf 'Type "purge songhealth-qdev" to continue: '
  IFS= read -r reply || reply=
  [[ $reply == 'purge songhealth-qdev' ]] || die "not confirmed: nothing was changed"
fi

systemctl --user stop "$APP" "$DB" 2>/dev/null || :
for u in "${UNITS[@]}"; do rm -f -- "$UNIT_DIR/$u"; done
systemctl --user daemon-reload
note "runtime stopped and its units removed"
if [[ $PURGE == no ]]; then
  note "kept: volumes, secrets, $STATE_DIR and $SRC (re-run the installer to bring the runtime back)"
  exit 0
fi

podman rm --force --ignore "$APP_CTR" "$DB_CTR" >/dev/null
for v in "$DB_VOLUME" "$MEDIA_VOLUME"; do
  if podman volume exists "$v"; then podman volume rm "$v" >/dev/null; note "deleted volume $v"; fi
done
for s in "${SECRETS[@]}" "$ROUTE_SECRET"; do
  if podman secret exists "$s"; then podman secret rm "$s" >/dev/null; note "deleted secret $s"; fi
done
if podman network exists "$NETWORK"; then podman network rm "$NETWORK" >/dev/null; note "deleted network $NETWORK"; fi
rm -f -- "$STATE_DIR/dev-pat" "$ROLE_FIXTURE" "$ROUTE_ACCESS" "$STATE_DIR/db-first-init"
rm -rf -- "$SHARE_DIR"
note "purged; kept $SRC and $STATE_DIR/backups"

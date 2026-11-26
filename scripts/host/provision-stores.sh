#!/usr/bin/env bash
# The one-time provisioning of Songhealth's two stores (Feature 016, #456; Product Owner, #456
# comment 7166769976), run once per store as the Deployment account, never as root: the database's
# Phase A exactly as the header of deploy/quadlet/songhealth-db.container states it, the
# least-privilege application role of production-foundation.md §5.2, and the media store with its
# marker of §5.3. It prints no secret: the role's password reaches psql on standard input from the
# account's own songhealth-app.env. It refuses a database store that is not verifiably empty and a
# media volume that already exists, and it never deletes, resets or re-marks anything.
#
#   bash provision-stores.sh      after scripts/host/root-setup.sh and the units' installation
#
# The two images are the ones the installed units pin, so a new Release needs no edit here.
set -u
UNITS=$HOME/.config/containers/systemd
DB_IMAGE=$(sed -n 's/^Image=//p' "$UNITS/songhealth-db.container")
APP_IMAGE=$(sed -n 's/^Image=//p' "$UNITS/songhealth-app.container")
die() { echo "provision-stores: $*" >&2; exit 1; }
case "$DB_IMAGE" in *@sha256:*) ;; *) die "no digest-pinned Image= in $UNITS/songhealth-db.container" ;; esac
case "$APP_IMAGE" in *@sha256:*) ;; *) die "no digest-pinned Image= in $UNITS/songhealth-app.container" ;; esac

echo "== Phase A 1: volume and secret"
podman volume exists songhealth-db-data || podman volume create songhealth-db-data >/dev/null || die "volume create"
podman secret exists songhealth-db-password || die "secret songhealth-db-password missing"

echo "== Phase A 2: the store is genuinely empty"
MP="$(podman volume inspect --format '{{.Mountpoint}}' songhealth-db-data)"; RC=$?
[ "$RC" -eq 0 ] || die "volume metadata query failed (status $RC)"
case "$MP" in /*) ;; *) die "unusable mountpoint result" ;; esac
OUT="$(podman unshare /bin/ls -A -- "$MP" && printf x)"; RC=$?
[ "$RC" -eq 0 ] || die "store enumeration failed (status $RC)"
[ "$OUT" = "x" ] || die "store is not verifiably empty"
echo "empty"

echo "== Phase A 3: strict parser"
cfg="$UNITS/songhealth-db.env"
unset POSTGRES_USER POSTGRES_DB
{ [ -f "$cfg" ] && [ -r "$cfg" ]; } || die "configuration missing or unreadable"
LC_ALL=C grep -a -q -v -E '^POSTGRES_(USER|DB)=[A-Za-z0-9_]+$' "$cfg"; rc=$?
[ "$rc" -eq 1 ] || die "out-of-grammar bytes or records, or validation failed (status $rc)"
NU="$(LC_ALL=C grep -a -c -E '^POSTGRES_USER=' "$cfg")"; rc=$?
[ "$rc" -eq 0 ] && [ "$NU" -eq 1 ] || die "POSTGRES_USER count (status $rc)"
ND="$(LC_ALL=C grep -a -c -E '^POSTGRES_DB=' "$cfg")"; rc=$?
[ "$rc" -eq 0 ] && [ "$ND" -eq 1 ] || die "POSTGRES_DB count (status $rc)"
POSTGRES_USER="$(LC_ALL=C sed -n 's/^POSTGRES_USER=//p' "$cfg")"; rc=$?
[ "$rc" -eq 0 ] || die "POSTGRES_USER extraction failed (status $rc)"
POSTGRES_DB="$(LC_ALL=C sed -n 's/^POSTGRES_DB=//p' "$cfg")"; rc=$?
[ "$rc" -eq 0 ] || die "POSTGRES_DB extraction failed (status $rc)"
case "$POSTGRES_USER" in ""|*[!A-Za-z0-9_]*) die "POSTGRES_USER invalid after extraction" ;; esac
case "$POSTGRES_DB" in ""|*[!A-Za-z0-9_]*) die "POSTGRES_DB invalid after extraction" ;; esac
echo "POSTGRES_USER=$POSTGRES_USER POSTGRES_DB=$POSTGRES_DB"

echo "== Phase A 4: one-shot initialization"
podman run -d --name songhealth-db-provision --network none \
  --volume songhealth-db-data:/var/lib/postgresql --secret songhealth-db-password \
  -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_DB="$POSTGRES_DB" \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/songhealth-db-password "$DB_IMAGE" >/dev/null || die "podman run"

echo "== Phase A 5: final-server verification"
# a. The FINAL server's record: the entrypoint's temporary server logs "ready" once before "init
# process complete", and only the final server logs it after that line.
final=no
for _ in $(seq 1 90); do
  logs=$(podman logs songhealth-db-provision 2>&1) || die "podman logs failed"
  case "$logs" in
    *'PostgreSQL init process complete'*) after=${logs#*PostgreSQL init process complete}
      case "$after" in *'database system is ready to accept connections'*) final=yes; break ;; esac ;;
  esac
  sleep 2
done
[ "$final" = yes ] || die "no final-server 'ready to accept connections' record after three minutes"
echo "final server ready"
podman exec songhealth-db-provision pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || die "pg_isready"
db=$(podman exec songhealth-db-provision psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select current_database()")
user=$(podman exec songhealth-db-provision psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select current_user")
[ "$db" = "$POSTGRES_DB" ] && [ "$user" = "$POSTGRES_USER" ] || die "SQL identity mismatch"
echo "identity: database=$db user=$user"

echo "== Phase A 6: hand over to normal startup"
podman rm -f songhealth-db-provision >/dev/null || die "podman rm songhealth-db-provision"
systemctl --user daemon-reload || die "daemon-reload"
systemctl --user start songhealth-db.service || die "songhealth-db.service did not start"
systemctl --user is-active songhealth-db.service || die "songhealth-db.service is not active"

echo "== §5.2 the least-privilege application role"
app_env="$UNITS/songhealth-app.env"
APP_ROLE=$(sed -n 's/^PGUSER=//p' "$app_env")
case "$APP_ROLE" in ""|*[!a-z0-9_]*) die "PGUSER invalid" ;; esac
pw=$(sed -n 's/^PGPASSWORD=//p' "$app_env")
case "$pw" in ""|*[!0-9a-f]*) die "PGPASSWORD is not the hex value scripts/host/root-setup.sh writes" ;; esac
# The statement reaches psql on standard input, never on a command line. A failed statement is
# logged with its text by default (log_min_error_statement = error, PostgreSQL 18 "Error Reporting
# and Logging"), so this session logs none: the password never reaches the container's log.
printf "SET log_min_error_statement = panic;\nCREATE ROLE %s LOGIN PASSWORD '%s' NOSUPERUSER NOCREATEDB NOCREATEROLE;\nGRANT CONNECT ON DATABASE %s TO %s;\nGRANT USAGE, CREATE ON SCHEMA public TO %s;\n" \
  "$APP_ROLE" "$pw" "$POSTGRES_DB" "$APP_ROLE" "$APP_ROLE" |
  podman exec -i systemd-songhealth-db psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null || die "role"
unset pw
podman exec systemd-songhealth-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select rolname, rolsuper, rolcreatedb, rolcreaterole, has_database_privilege(rolname, '$POSTGRES_DB', 'CONNECT'), has_schema_privilege(rolname, 'public', 'USAGE'), has_schema_privilege(rolname, 'public', 'CREATE') from pg_roles where rolname = '$APP_ROLE'" || die "role check"

echo "== §5.3 the media store and its marker"
podman volume exists songhealth-media && die "songhealth-media exists already; not re-marked"
podman volume create songhealth-media >/dev/null || die "volume create songhealth-media"
# The first mount of the empty volume copies the image's /app/media (node:node 0750) into it
# (podman-run(1), --volume: "copy up" of a named volume's empty content, on by default; read back as
# uid 1000 in #456), and the marker is written by the application's own non-root user.
podman run --rm --network none --user node -v songhealth-media:/app/media "$APP_IMAGE" \
  sh -c 'printf "provisioned %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /app/media/.songhealth-media-store && ls -lan /app/media' ||
  die "marker"
echo "== done"

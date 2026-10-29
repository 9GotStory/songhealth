# shellcheck shell=bash
# Songhealth development database — least-privilege application role (Feature 002 T036).
# Sourced (mode 0644) by the official postgres image entrypoint from
# /docker-entrypoint-initdb.d during the FIRST cluster initialization only, against its
# socket-only temporary server; docker_process_sql is the entrypoint's own psql helper
# (ON_ERROR_STOP, bootstrap superuser, POSTGRES_DB). psql reads the app password itself
# from the mounted podman secret (\set with a backtick command), so the value never
# appears in a process argument or the environment, and the session disables statement
# logging first so a failing statement cannot write it to the server log.
docker_process_sql <<'EOSQL'
\set app_pw `cat /run/secrets/songhealth-qdev-app-password`
SET log_min_error_statement = panic;
SET log_statement = none;
BEGIN;
CREATE ROLE songhealth_qdev_app LOGIN PASSWORD :'app_pw'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER DATABASE songhealth_qdev OWNER TO songhealth_qdev_app;
ALTER SCHEMA public OWNER TO songhealth_qdev_app;
COMMIT;
EOSQL

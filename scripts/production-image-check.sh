#!/usr/bin/env bash
# Production image check (#67 retro; Product Owner, #67 comment 6558736325): build
# deploy/Containerfile for one commit, check its native pieces, run the startup gate's build as the
# image's own user (#453), run the image once against the development runtime's data, show how a
# News picture is served, stop it the way the commit's application unit would, and remove the
# container and the image.
#   scripts/production-image-check.sh --sha <commit> [<news-path>] [-- <command> [<arg>...]]
# The startup build (#453; spec #450 "The image and the startup gate") is the build the T013 gate
# runs in its S2 each time the production container starts: it removes the migration manifest and
# runs `npm run build` as the image's user, in a container with no network and the placeholder
# inputs deploy/Containerfile's build stage uses. It must emit dist/server/entry.mjs and
# .emdash/migrations.json anew, as a non-root user, with no path under /app that anyone may write.
# The stop reads deploy/quadlet/songhealth-app.container at the commit: the run takes Podman's init
# when the unit sets RunInit=, and the stop timeout the unit sets. It must end before that timeout,
# with no kill, in an exit status the unit counts a success. Each verdict comes from
# scripts/production-image-check/plan.ts. The run prints the startup build's time and peak memory,
# the time the server took to serve, its peak memory, and the stop's time and exit status.
# The run is the Product Owner's exception to "one application server" (#67 comment 6558196151):
# a temporary container on the runtime's private network that connects to its database as the
# least-privilege app role, with the runtime's own podman secrets as environment variables, the
# media volume read-only, published on 127.0.0.1:4325 only. Production's native migration mode is
# `check`, so it changes no schema; like any server, it adds a missed address to EmDash's 404 log.
# The image is never deployed or tagged as a release. A base image that is missing locally is
# pulled by the digest deploy/Containerfile pins.
# Cleanup: the decision named removing the build's intermediate images by the IDs it added. Other
# projects share this image storage and may build meanwhile, so the build instead runs with
# `--layers=false`, which commits the final image alone (podman 5.8.4, 2026-11-01), and only its
# tag is removed. Any image the run added that is still there at the end is listed, not removed.
# <news-path> defaults to the demo dataset's Featured News, which has a picture. sharp is optional
# (spec #51 "Dependencies"), so a sharp that does not load is reported, not failed. <command> runs
# while the image serves, with CHECK_ORIGIN, CHECK_IMAGE and CHECK_NETWORK in its environment
# (ADR 0003's revisit, #183), and its failure fails the check. Exit status 1:
# a step failed; 2: a wrong argument. Log lines are printed only with credentials masked.
set -euo pipefail
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

usage() { echo "usage: ${0##*/} --sha <commit> [<news-path>] [-- <command> [<arg>...]]" >&2; exit 2; }
[[ ${1:-} == --sha && -n ${2:-} ]] || usage
REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMMIT=$(git -C "$REPO" rev-parse --verify -q "$2^{commit}") || die "no commit $2"
NEWS_PATH=/news/demo-news-ncd-screening
shift 2
if [[ $# -gt 0 && $1 != -- ]]; then NEWS_PATH=${1:-$NEWS_PATH}; shift; fi
if [[ $# -gt 0 ]]; then [[ $1 == -- && $# -gt 1 ]] || usage; shift; fi
CHECK_PORT=4325
CHECK_ORIGIN=http://127.0.0.1:$CHECK_PORT
TAG=localhost/songhealth-image-check:${COMMIT:0:7}
CTR=songhealth-image-check

# The database the runtime's app unit names: one source of truth for the connection.
unit_env() { sed -n "s/^Environment=$1=//p" "$SRC/deploy/dev-quadlet/songhealth-dev-app.container"; }
# Log lines with anything shaped like a credential masked: a PAT, the encryption key, a database
# URL, or a long hexadecimal string such as the database password.
masked() {
  sed -E 's/(ec_pat_|ec_oat_|emdash_enc_v1_)[A-Za-z0-9_-]+/\1[masked]/g
    s#postgres(ql)?://[^[:space:]]*#postgres://[masked]#g; s/[0-9a-fA-F]{32,}/[masked]/g'
}
# Seconds since an $EPOCHREALTIME reading, to the hundredth.
since() { awk -v start="$1" -v now="$EPOCHREALTIME" 'BEGIN { printf "%.2f", now - start }'; }

podman container exists "$CTR" && die "container $CTR exists: another check is running or was left behind"
podman image exists "$TAG" && die "image $TAG exists: remove it first (podman rmi $TAG)"
curl -s -o /dev/null --max-time 2 "$CHECK_ORIGIN/" && die "$CHECK_ORIGIN already answers"

work=$(mktemp -d)
podman images -aq --no-trunc | sort >"$work/images-before"
cleanup() {
  podman rm -f -t 0 "$CTR" >/dev/null 2>&1 || true
  podman rmi "$TAG" >/dev/null 2>&1 || true
  local left
  left=$(podman images -aq --no-trunc | sort | comm -13 "$work/images-before" -)
  rm -rf "$work"
  if [[ -n $left ]]; then warn "images added during the run are still present: ${left//$'\n'/ }"
  else note "removed the container and the image; no image the run added is left"; fi
}
trap cleanup EXIT

note "building deploy/Containerfile at ${COMMIT:0:7} from a git archive"
mkdir "$work/context"
{ git -C "$REPO" archive "$COMMIT" | tar -x -C "$work/context"; } || die "could not export ${COMMIT:0:7}"
started=$SECONDS
podman build --layers=false -f "$work/context/deploy/Containerfile" -t "$TAG" \
  "$work/context" >"$work/build.log" 2>&1 || { tail -20 "$work/build.log" >&2; die "the image build failed"; }
note "built $(podman image inspect "$TAG" --format '{{.Id}}' | cut -c1-12) in $((SECONDS - started)) s," \
  "$(podman image inspect "$TAG" --format '{{.Size}}' | numfmt --to=si) bytes"

note "native pieces, in a container with no network:"
pieces=$(podman run --rm --network none "$TAG" node -e '
const out = { node: process.version };
try { require("@tailwindcss/oxide").Scanner; out.oxide = "loads"; } catch (e) { out.oxide = "FAILS: " + e.message.split("\n")[0]; }
import("sharp").then(async ({ default: sharp }) => {
  const png = await sharp({ create: { width: 4, height: 3, channels: 3, background: "#0b6b57" } }).png().toBuffer();
  out.sharp = `loads (libvips ${sharp.versions.vips}), made a ${(await sharp(png).metadata()).width}x3 PNG`;
}).catch((e) => { out.sharp = "FAILS: " + e.message.split("\n")[0]; })
  .finally(() => { console.log(JSON.stringify(out)); process.exit(out.oxide === "loads" ? 0 : 1); });
') || { printf '%s\n' "$pieces"; die "Tailwind's oxide binary does not load"; }
printf '%s\n' "$pieces"
if [[ $pieces == *'"sharp":"FAILS'* ]]; then
  warn "sharp does not load: pages still serve original pictures (ADR 0003), but its revisit needs sharp"
fi

note "the startup gate's build, as the image's own user, in a container with no network:"
startup_build=$(podman run --rm --network none \
  -e PGHOST=build.internal -e PGPORT=5432 -e PGDATABASE=build -e PGUSER=build \
  -e PGPASSWORD=build-time-placeholder-not-a-secret \
  -e EMDASH_MIGRATION_DATABASE_URL=postgresql://build:build-time-placeholder-not-a-secret@build.internal:5432/build \
  -e EMDASH_SITE_URL=http://build.invalid -e HOST=127.0.0.1 -e PORT=4321 \
  -e EMDASH_ENCRYPTION_KEY=build-time-placeholder-not-a-secret \
  "$TAG" node -e '
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const started = Date.now();
fs.rmSync(".emdash/migrations.json", { force: true });
const build = spawnSync("npm", ["run", "build"], { encoding: "utf8", maxBuffer: 1 << 28 });
const seconds = Math.round((Date.now() - started) / 100) / 10;
const mtime = (file) => { try { return fs.statSync(file).mtimeMs; } catch { return null; } };
const open = spawnSync("find", ["/app", "-xdev", "-perm", "-o+w", "!", "-type", "l"], { encoding: "utf8" });
let peakBytes = null;
try { peakBytes = Number(fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8")); } catch {}
const output = `${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(-400);
console.log(JSON.stringify({ uid: process.getuid(), status: build.status, startedMs: started,
  entryMs: mtime("dist/server/entry.mjs"), manifestMs: mtime(".emdash/migrations.json"),
  worldWritable: open.stdout.split("\n").filter(Boolean), output, seconds, peakBytes }));
') || die "the startup build could not be run in the image"
node "$REPO/scripts/production-image-check-verdict.ts" startup-build <<<"$startup_build" \
  || die "the startup gate's build fails in this image as its runtime user"

UNIT=$work/context/deploy/quadlet/songhealth-app.container
read -r unit_init stop_timeout < <(node "$REPO/scripts/production-image-check-verdict.ts" stop-contract "$UNIT")
run_init=() init_note="without an init"
[[ $unit_init == true ]] && run_init=(--init) init_note="with Podman's init"
note "running the image on $CHECK_ORIGIN against the development database" \
  "($init_note and a $stop_timeout s stop timeout, as the commit's application unit)"
run_started=$EPOCHREALTIME
podman run -d --name "$CTR" "${run_init[@]}" --stop-timeout "$stop_timeout" \
  --network "$NETWORK" -p "127.0.0.1:$CHECK_PORT:$CHECK_PORT" \
  -e HOST=0.0.0.0 -e PORT="$CHECK_PORT" -e EMDASH_SITE_URL="$CHECK_ORIGIN" \
  -e PGHOST="$(unit_env PGHOST)" -e PGPORT="$(unit_env PGPORT)" \
  -e PGDATABASE="$(unit_env PGDATABASE)" -e PGUSER="$(unit_env PGUSER)" \
  --secret songhealth-qdev-app-password,type=env,target=PGPASSWORD \
  --secret songhealth-qdev-migration-database-url,type=env,target=EMDASH_MIGRATION_DATABASE_URL \
  --secret songhealth-qdev-encryption-key,type=env,target=EMDASH_ENCRYPTION_KEY \
  -v "$MEDIA_VOLUME:/app/media:ro" "$TAG" >/dev/null || die "the image did not start"
deadline=$((SECONDS + 60))
until serves_marker "$CHECK_ORIGIN" 5; do
  if ((SECONDS >= deadline)); then
    podman logs --tail 20 "$CTR" 2>&1 | masked >&2
    die "the image did not serve the public marker within 60 s"
  fi
  sleep 1
done
note "it serves the public marker at /, $(since "$run_started") s after the container was started"

note "the first picture on $NEWS_PATH, in production and on the development runtime:"
python3 -I - "$CHECK_ORIGIN" "$ORIGIN" "$NEWS_PATH" <<'PY' || die "the News page or its picture could not be read"
import sys, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser


class FirstImage(HTMLParser):
    """The first <img> inside <main>."""

    def __init__(self):
        super().__init__()
        self.in_main, self.image = False, None

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.in_main = True
        elif tag == "img" and self.in_main and self.image is None:
            self.image = dict(attrs)


def served(origin, path):
    parser = FirstImage()
    with urllib.request.urlopen(origin + path, timeout=30) as page:
        parser.feed(page.read().decode())
    image = parser.image
    if image is None:
        return f"{origin}: no picture in <main>"
    src = image["src"]
    candidates = {entry.split()[0] for entry in image.get("srcset", "").split(",") if entry.strip()}
    with urllib.request.urlopen(urllib.request.Request(urllib.parse.urljoin(origin, src)), timeout=30) as file:
        body = file.read()
        kind = file.headers.get("content-type")
    return (f"{origin}: declared {image.get('width')} x {image.get('height')}; src {src.split('?')[0]}"
            f"{' (a rendition)' if src.startswith('/_image') else ' (the original)'}; "
            f"{len(candidates)} distinct srcset file(s); src downloads {len(body):,} bytes of {kind}")


failed = False
for origin in sys.argv[1:3]:
    try:
        print("  " + served(origin, sys.argv[3]))
    except (OSError, ValueError) as error:  # urllib's errors are OSErrors
        reason = error.code if isinstance(error, urllib.error.HTTPError) else type(error).__name__
        print(f"  {origin}: {sys.argv[3]} failed ({reason})")
        failed = True
sys.exit(1 if failed else 0)
PY

if (($# > 0)); then
  note "running while the image serves: $*"
  CHECK_ORIGIN=$CHECK_ORIGIN CHECK_IMAGE=$TAG CHECK_NETWORK=$NETWORK "$@" || die "the command failed"
fi

lines=$(podman logs "$CTR" 2>&1)
note "its log: $(grep -c . <<<"$lines") lines, $(grep -ciE 'error|warn' <<<"$lines" || true) with an error or a warning"
grep -qE 'ec_pat_|ec_oat_|emdash_enc_v1_|postgres(ql)?://' <<<"$lines" && die "its log holds a credential"

peak=$(podman exec "$CTR" cat /sys/fs/cgroup/memory.peak 2>/dev/null || echo unreadable)
[[ $peak == unreadable ]] || peak="$(numfmt --to=iec-i --suffix=B "$peak")"
note "its peak memory while serving: $peak"
stop_started=$EPOCHREALTIME
podman stop "$CTR" >/dev/null 2>"$work/stop.log" || true
stop_seconds=$(since "$stop_started")
exit_code=$(podman container inspect "$CTR" --format '{{.State.ExitCode}}')
note "asked to stop, it exited $exit_code after $stop_seconds s"
grep -q . "$work/stop.log" && sed 's/^/  | /' "$work/stop.log"
node "$REPO/scripts/production-image-check-verdict.ts" stop "$UNIT" "$exit_code" "$stop_seconds" \
  || die "the container did not leave cleanly on the stop signal"
note "PRODUCTION IMAGE CHECK: PASS at ${COMMIT:0:7}"

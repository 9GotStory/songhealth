#!/usr/bin/env bash
# Songhealth development runtime — RESIDUE (#53 retro): a count of what test runs leave behind,
# through the native API with the development PAT, which is never printed. It changes nothing
# unless --clear-404-log is given. Synthetic
# fixtures carry the mark songhealth-f002-synthetic (tests/browser/cms.helpers.ts
# SYNTHETIC_FIXTURE_MARK), and requests for missing pages use songhealth-unknown- paths.
#   scripts/dev-runtime-residue.sh [--clear-404-log | --clear-404-log-including-others]
# Entries (live or in trash), media, terms, bylines, redirects and menu items must all be gone after
# a task run: any that remain are listed and the exit status is 1. EmDash's 404 log keeps the tests'
# misses too, but they can be removed only by clearing the log or pruning it by age, not one by one,
# so those are counted without failing (docs/operations/development-quadlet.md). A miss without the
# synthetic marks, such as one a person met while browsing, is listed by its path and time.
# --clear-404-log first clears that log through the native API, just before the Product Owner's
# review (#67 retro), and only while every miss in it is synthetic: otherwise it lists the others,
# clears nothing and exits 3 (#123 retro). --clear-404-log-including-others clears them too, once
# someone has looked at them. Exit status 2: the count or the clear failed, or a wrong argument.
set -uo pipefail
# shellcheck source=scripts/dev-runtime-common.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-runtime-common.sh"

case ${1:-} in
  "") clear=none ;;
  --clear-404-log) clear=synthetic ;;
  --clear-404-log-including-others) clear=all ;;
  *) echo "usage: ${0##*/} [--clear-404-log | --clear-404-log-including-others]" >&2; exit 2 ;;
esac

[[ -s $STATE_DIR/dev-pat && $(stat -c %a "$STATE_DIR/dev-pat") == 600 ]] \
  || die "the development PAT $STATE_DIR/dev-pat is missing or not mode 0600"
python3 -I - "$STATE_DIR/dev-pat" "$ORIGIN" "$clear" <<'PY'
import json, sys, urllib.error, urllib.parse, urllib.request

AUTH = {"Authorization": "Bearer " + open(sys.argv[1]).read().strip()}
origin = sys.argv[2]
clear = sys.argv[3]
FIXTURE = "songhealth-f002-synthetic"
MISSES = (FIXTURE, "songhealth-unknown-")


def get(path, **query):
    url = origin + path + ("?" + urllib.parse.urlencode(query) if query else "")
    request = urllib.request.Request(url, headers=AUTH)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["data"]


def every(path, **query):
    """Every item of a native list, following nextCursor."""
    cursor = None
    while True:
        data = get(path, limit=100, **query, **({"cursor": cursor} if cursor else {}))
        yield from data["items"]
        cursor = data.get("nextCursor")
        if not cursor:
            return


def is_marked(item, marks=(FIXTURE,)):
    return any(m in json.dumps(item, ensure_ascii=False) for m in marks)


def marked(items, marks=(FIXTURE,)):
    return sum(1 for item in items if is_marked(item, marks))


def other_misses():
    """The 404 log's misses without the synthetic marks, by path and time: never an IP or agent."""
    return [
        f"{item['path']} at {item['createdAt']}"
        for item in every("/_emdash/api/redirects/404s")
        if not is_marked(item, MISSES)
    ]


try:
    if clear == "synthetic" and (others := other_misses()):
        for miss in others:
            print(f"404 log, not synthetic: {miss}")
        print("404 log NOT cleared: look at the misses above, then clear with "
              "--clear-404-log-including-others")
        sys.exit(3)
    if clear != "none":
        # emdash 1.1.0 clears the whole log or nothing, with redirects:manage
        # (src/astro/routes/api/redirects/404s/index.ts).
        request = urllib.request.Request(
            origin + "/_emdash/api/redirects/404s", method="DELETE", headers=AUTH
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            print(f"404 log cleared: {json.load(response)['data']['deleted']} entries")
    left = {}
    for collection in get("/_emdash/api/schema/collections")["items"]:
        slug = collection["slug"]
        left[f"{slug} entries"] = marked(every(f"/_emdash/api/content/{slug}"))
        left[f"{slug} entries in trash"] = marked(every(f"/_emdash/api/content/{slug}/trash"))
    left["media"] = marked(every("/_emdash/api/media"))
    for taxonomy in get("/_emdash/api/taxonomies")["taxonomies"]:
        name = taxonomy["name"]
        left[f"{name} terms"] = marked(get(f"/_emdash/api/taxonomies/{name}/terms")["terms"])
    for menu in get("/_emdash/api/menus"):
        name = menu["name"]
        left[f"{name} menu items"] = marked(get(f"/_emdash/api/menus/{name}")["items"])
    left["bylines"] = marked(every("/_emdash/api/admin/bylines", search=FIXTURE))
    left["redirects"] = marked(every("/_emdash/api/redirects", search=FIXTURE))
    misses = marked(every("/_emdash/api/redirects/404s"), MISSES)
    others = other_misses()
except (OSError, KeyError, ValueError) as error:  # urllib's errors and timeouts are OSErrors
    reason = error.code if isinstance(error, urllib.error.HTTPError) else type(error).__name__
    print(f"RESIDUE: UNKNOWN (the {'clear or the ' if clear != 'none' else ''}count failed: {reason})")
    sys.exit(2)

for kind, count in left.items():
    if count:
        print(f"LEFT: {count} synthetic {kind}")
print(f"404 log: {misses} synthetic misses, cleared as a whole before the Product Owner's review")
for miss in others:
    print(f"404 log, not synthetic: {miss}")
found = any(left.values())
print("RESIDUE: FOUND" if found else "RESIDUE: NONE")
sys.exit(1 if found else 0)
PY

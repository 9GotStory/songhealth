#!/usr/bin/env bash
# Songhealth development runtime — RESIDUE (#53 retro): a count of what test runs leave behind,
# through the native API with the development PAT, which is never printed. It changes nothing
# unless --clear-404-log is given. Synthetic
# fixtures carry the mark songhealth-f002-synthetic (tests/browser/cms.helpers.ts
# SYNTHETIC_FIXTURE_MARK), requests for missing pages use songhealth-unknown- paths, and every
# browser-test request carries a songhealth-unknown- referrer, which the 404 log keeps
# (playwright.config.ts).
#   scripts/dev-runtime-residue.sh [--clear-404-log | --clear-404-log-including-others]
# Entries (live or in trash), media, terms, bylines, redirects and menu items must all be gone after
# a task run: any that remain are listed and the exit status is 1. EmDash's 404 log keeps the tests'
# misses too, but they can be removed only by clearing the log or pruning it by age, not one by one,
# so those are counted without failing (docs/operations/development-quadlet.md). A miss without the
# synthetic marks, such as one a person met while browsing, is counted, 0 included, so an evidence
# record can quote an empty log, and listed by its path and time (#151 retro).
# The demo dataset's entries (slugs that start with demo-, scripts/demo-dataset/plan.ts) are all
# published while it is installed. One that is not, such as an entry a browser suite returned to
# draft and failed to give back, is listed and the exit status is 1:
# `scripts/dev-runtime-env.sh node scripts/demo-dataset.ts add` publishes it again (#244 retro).
# --clear-404-log first clears that log through the native API, just before the Product Owner's
# review (#67 retro), and only while every miss in it is synthetic: otherwise it lists the others,
# clears nothing and exits 3 (#123 retro). --clear-404-log-including-others clears them too, once
# someone has looked at them. Exit status 2: the count or the clear failed, or a wrong argument.
# Its last line counts the database connection errors in the app's journal over the last hour,
# the span of a full suite: a run that failed on a timeout or a 500 while the database dropped its
# connections is the host's, not the change's (#246 retro: two cases of the last suite failed while
# another project's containers loaded the host). The line never changes the exit status.
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
DEMO = "demo-"
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
    demo = 0
    demo_unpublished = []
    for collection in get("/_emdash/api/schema/collections")["items"]:
        slug = collection["slug"]
        entries = list(every(f"/_emdash/api/content/{slug}"))
        left[f"{slug} entries"] = marked(entries)
        for entry in entries:
            if str(entry.get("slug") or "").startswith(DEMO):
                demo += 1
                if entry.get("status") != "published":
                    demo_unpublished.append(f"{slug}/{entry['slug']}")
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
print(f"404 log: {len(others)} misses without the synthetic marks")
for miss in others:
    print(f"404 log, not synthetic: {miss}")
print(f"demo dataset: {demo} entries, {len(demo_unpublished)} not published")
for entry in demo_unpublished:
    print(f"demo dataset, not published: {entry}")
if demo_unpublished:
    print("DEMO DATASET: INCOMPLETE (scripts/dev-runtime-env.sh node scripts/demo-dataset.ts add)")
found = any(left.values())
print("RESIDUE: FOUND" if found else "RESIDUE: NONE")
sys.exit(1 if found or demo_unpublished else 0)
PY
status=$?
# LC_ALL=C: the host's Thai locale gives journalctl dates it then cannot select by.
errors=$(LC_ALL=C journalctl --user -u "$APP" --since "-1h" --no-pager 2>/dev/null \
  | grep -E 'Connection terminated unexpectedly|not yet accepting connections' || true)
if [[ -n $errors ]]; then
  echo "database: $(wc -l <<<"$errors") connection errors in the app's journal in the last hour, the first at $(head -1 <<<"$errors" | cut -c1-15)"
else
  echo "database: 0 connection errors in the app's journal in the last hour"
fi
exit "$status"

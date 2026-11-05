---
status: accepted
---

# Admin changes are traced by one log line per request

`05` §10 asks V1 to show who did what, and when, for three kinds of event:

- publishing;
- schema and Admin changes;
- user-access changes.

Native evidence comes first, and logging is added for a gap only (`05` §10, `07` §11, `10` §17).
EmDash 1.1.0 records "when" for some of these events and "who" for none of them
(`docs/agents/emdash-1.1.0.md` "Traceability", #115):

- a publish keeps its time but not who published;
- schema and menu records keep their times at most, and settings keep neither time nor author;
- a role change or a disabled account only moves the user's `updated_at`;
- an accepted invite and a revoked API token leave no row.

So Songhealth logs the gap itself. One Astro middleware writes one JSON line to standard output for
each state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) under `/_emdash/api/`, once the
request has its answer. The line holds:

- the time;
- the user the request acted as, and their role;
- the method;
- the path, without its query string;
- the status, whether the request succeeded or was refused.

It never holds a request body, query string, header, token or password. The Quadlet units set no
log driver, and Podman sends a container's output to journald, as it does for the development
runtime's application (2026-11-01). An operator reads the lines with `journalctl`.

Routine editing traffic is left out, because native records already attribute it, or because it
changes nothing:

- creating and updating an entry: each save is a revision with its author and time;
- the edit lock, which the Admin takes, refreshes and releases while someone edits;
- media uploads: each media item keeps who uploaded it and when;
- the toolbar's renewal of its visual-action token: a public page that a signed-in Author or above
  keeps open sends it every four minutes, with nobody acting, and it changes nothing. Requests
  that also change nothing but follow a person's click, such as a preview URL and the media-usage
  progress, keep their lines (#164, the Product Owner's decision of 2026-11-05).

EmDash's MCP endpoint is turned off (`mcp: false`). It runs publishing, schema, taxonomy and menu
tools behind a single path, which a line per request cannot tell apart, and Songhealth does not
use it.

`07` §11 and `10` §17 add targeted logging only when a governance requirement names the events.
`05` §10 is read as that requirement, because it names them. The Product Owner accepted these
choices on 2026-11-01 (#115 comment 6559441351, "ตามแนะนำทั้งหมด").

## Considered options

- **Accept the gaps:** no code, but V1 could not say who published an entry or changed someone's
  role.
- **EmDash's `audit_logs` table:** it has the right shape, and EmDash already names `publish`,
  `schema_change` and `settings_update` actions. But 1.1.0 writes it only for plugin MCP tools and
  transfers and reads it nowhere, and the package does not export its repository, so Songhealth
  would write to EmDash's internals.
- **`@emdash-cms/plugin-audit-log` 0.2.3:** EmDash's own plugin records content saves, deletes and
  media uploads. Revisions already cover the saves, and the plugin closes none of the gaps. It
  would also be a new dependency.
- **A plugin hook:** EmDash has no hook for schema, settings or user changes.
- **A list of the routes to log:** narrower, but a list misses routes. User access alone spans the
  users, invites, API tokens, allowed domains and OAuth clients routes.

## Consequences

- The log answers who and when for each request, not what changed inside it. The path names the
  entry, field, menu or user, and the native records hold the new state.
- A scheduled publish runs inside the application, with no request. The log shows who scheduled
  it, and the entry shows when it went live.
- How long the lines are kept is journald's retention on the production host. The production track
  sets it (Feature 001 T022/T028), and there the Product Owner confirms whether a legal minimum
  applies.
- No audit table, dashboard or permission is added (`06` §10).
- Turning MCP on later needs its own logging decision.

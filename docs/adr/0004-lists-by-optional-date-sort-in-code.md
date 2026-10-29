---
status: accepted
---

# Lists ordered by an optional date sort every published entry in code

Some public lists order by a date that staff may leave empty, and fall back to the publication
date when it is (`04` §10, spec #51 "Public reads"):

- Activities, by `activity_at`;
- Announcements, by `announcement_at`, after splitting them into current and closed;
- Health Reports, by `report_at` (#59);
- the Homepage's latest Activities and current Announcements (#64).

EmDash 1.1.0 cannot express that order in a query (`node_modules/emdash/src/loader.ts`):

- `orderBy` names one column, and on PostgreSQL a descending sort puts the entries without the
  date first (`buildOrderByClause`);
- a `where` with a `null` value is skipped, so no query selects only the entries whose date is empty
  (`buildFieldConditions`).

These lists therefore read every published entry of their collection through `getEmDashCollection`,
newest publication first, and order it in `src/lib/dated-lists.ts`:

- by the own date, else the publication, newest first;
- stably, so entries with the same date keep their publication order;
- then cut to the requested page.

The Product Owner chose this option on 2026-10-29 (#56, "เห็นด้วยกับทาง A").

The Announcement's current-or-closed rule lives in the same module. An Announcement is current
when it has no close date, or its close date is today or later on the Bangkok calendar.

## Considered options

- **Two segments:** query the dated entries, then the undated ones, and stitch the pages together.
  The undated entries would still need their own order by publication, interleaved with the
  dated ones, and EmDash cannot select only the undated entries.
- **Make the date required:** changes the content model and staff work, so that an Activity
  without a known date could not be published.
- **A plugin that fills in the date from the publication:** a Songhealth-specific hook that
  rewrites content, with no native gap beyond sorting.

Documents keep their native newest-publication order (#55); the Product Owner kept it when choosing
this option.

## Consequences

- Each list request reads the whole published collection, and its time grows with that
  collection. The #56 pull request records the median and p95 latency with about 1,000 entries per
  collection on the development runtime.
- No cache is added (`08` §3): a cache could keep unpublished content visible.
- Revisit when a list's latency passes about 200 ms, for example after the WordPress import (`09`)
  brings real volumes.

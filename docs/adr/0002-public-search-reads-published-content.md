---
status: accepted
---

# Public search reads published content at request time

EmDash 1.1.0's built-in search is SQLite FTS5 only: `enableSearch` throws "Full-text search is
only available with SQLite databases" (`node_modules/emdash/src/search/fts-manager.ts:518`). The
native search that `10` §10 and `08` assume is therefore unavailable on Songhealth's PostgreSQL.

The Product Owner kept PostgreSQL on 2026-10-29. `/search` instead reads the published entries of
the searchable collections through EmDash's public query API when a search is made. It matches
Thai text as substrings and ranks title matches over summary matches over body matches.

Because the API returns only published content, a draft can never appear in the results. The
approach needs no index, no database extension, no projection and no access to EmDash's own tables.

## Considered options

- **Switch to SQLite.** This gives native FTS5 trigram search, but it is an infrastructure change
  to the Feature 001 foundation (configuration contract, Quadlet units, backup and restore).
- **External search engine.** A second service, which `08` §14 excludes for V1.
- **Index table synced by hooks.** A custom projection and sync pipeline, which `08` §10 excludes.
- **SQL against EmDash's internal tables.** This bypasses publication rules and breaks on upgrade.

## Consequences

Search time grows with the amount of published content. Measure it again after the trial WordPress
import. Revisit this decision if latency at real volume is unacceptable or if Thai search fails UAT.
The cheapest point to revisit is before production holds real content.

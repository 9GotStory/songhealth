# EmDash 1.1.0: verified behaviour

Facts the Songhealth pages and tests rely on, read from the installed package. Add a new fact under
its topic with its source path, relative to `node_modules/emdash/`. Write a Songhealth file with a
leading `./` and another package's file from its package name; `./tests/node/emdash-facts.test.ts`
checks that every cited file exists. When the pinned version changes, re-verify every line.

## Public reads

- `getEmDashCollection` and `getEmDashEntry` return published entries. They return a draft only
  with a valid signed preview token or in edit mode, so pages pass no status (`src/loader.ts`,
  `src/query.ts` `resolveEmDashEntry`).
- An entry's `id` is its slug and `data.id` is the database id. Taxonomy terms hydrate as
  `data.terms[taxonomy]`, ordered by label.
- `where` on a taxonomy name matches exact term slugs, ORed when given as an array. An unknown slug
  or an empty array matches nothing (`src/loader.ts` `resolveTermGroups`).
- `where` on any other key filters the column:
  - an exact value, an array (IN), or a range `{ gt, gte, lt, lte }`;
  - range values are strings, and PostgreSQL casts them to the column type;
  - a `null` value is skipped, so no filter selects entries whose field is empty;
  - there is no substring (`LIKE`) match (`buildFieldConditions`), so the Health Service
    Directory's name filter reads every published Health Service and matches in code;
  - a reference field bound to a relation can be neither filtered nor sorted (`buildFieldConditions`,
    `findStoragelessQueryKey`).
- `orderBy` is a plain `field DESC|ASC`, with `id` as the tiebreaker. On PostgreSQL, DESC puts
  NULLs first (`buildOrderByClause`). An optional date therefore cannot sort with a publish-date
  fallback inside the query; `./src/lib/dated-lists.ts` sorts in code instead (ADR 0004).
- `orderBy` on a text field sorts in SQL (`buildOrderByClause`), so by the database collation.
  The postgres 18.6 image that `./deploy/quadlet/songhealth-db.container` pins initialises it from
  the image's `LANG`, en_US.utf8 (glibc). On the development database (2026-10-30) it ordered
  กา, ไก่, ขา, เขียว, คน, โต๊ะ, แมว as `Intl.Collator("th")` does, leading vowels included, and
  `./tests/browser/public-services.spec.ts` checks a leading vowel in the Service catalog's order.
- Without a `limit`, `getEmDashCollection` returns every matching entry: the query has no `LIMIT`
  (`src/loader.ts`, `fetchLimit`).
- A `number` field is a `REAL` column (`src/schema/types.ts` `FIELD_TYPE_TO_COLUMN`), which is
  `float4` on PostgreSQL: about 7 significant digits. A Thai longitude keeps 5 decimal places
  (`100.1234567` reads back as `100.12346`, about 1 m), enough for a map link.
- No query returns distinct values. `./src/lib/documents.ts` `fiscalYears` walks down instead.
- `getEmDashEntry(type, slug, { references: { field: true } })` adds
  `entry.references.field.entries`. A target resolves only while it is published, or is a draft in
  preview (`src/query.ts` `attachReferences`). If you pass explicit type arguments, pass the
  selection as the third one, `getEmDashEntry<"documents", DocumentData, { successor: true }>`,
  otherwise `references` types as `{}`.
- A reference field's page holds 50 targets by default and at most 100 with `{ limit }`, in the
  order staff linked them (`src/references/staged.ts` `REFERENCE_PAGE_LIMIT`,
  `src/references/resolve.ts`). Referenced entries come without taxonomy terms or bylines
  (`src/loader.ts` `loadEntriesByGroups`).
- A field on the child side of a relation, such as a Service's `offering_facilities`, reads its
  targets in the order the links were created, not an order staff set
  (`src/database/repositories/relation.ts` `getParentsPageById`). Saving either side's field writes
  the same links (`src/api/handlers/relations.ts` `writeReferenceSelection`).
- A `url` field accepts only http, https, mailto, tel or a site-relative path
  (`src/schema/zod-generator.ts`, `src/utils/url.ts` `isSafeUrlFieldValue`). `isSafeHref`, exported
  from `emdash`, is the same check for rendering an href.
- `extractPlainText`, exported from `emdash`, turns Portable Text into plain text
  (`src/search/text-extraction.ts`). It needs no search index, so it works on PostgreSQL.
- `Astro.rewrite("/404")` answers 404, and EmDash logs the miss (`src/astro/middleware/redirect.ts`).
  A slug change gets a native 301, which needs the collection's `urlPattern`.

## Media

- Upload with `POST /_emdash/api/media`, multipart field `file`. The allowlist is images,
  `video/`, `audio/` and `application/pdf` (`src/api/handlers/media-allowlist.ts`).
  - `deduplicate` defaults to true; send `"false"` to get a fresh asset (`src/api/schemas/media.ts`).
  - The storage key is `{ulid}{filename's extension}` (`src/astro/routes/api/media.ts`).
- Saving an image or file field normalises the value. It keeps `id`, `provider`, `filename`,
  `mimeType`, the dimensions, `alt` and `meta.storageKey`, and drops `size`
  (`src/media/normalize.ts` `recordToMediaValue`). An image saved as `{ id }` takes its alt text
  from the library (`mergeProviderData`).
- An image inside a repeater item is normalised on save the way an image field is, so an item saved
  as `{ id }` takes its alt text from the library too (`src/emdash-runtime.ts`, the repeater
  sub-field loop beside the image fields).
- `/_emdash/api/media/file/{key}` serves the stored file by key. Safe image, video and audio types
  are served inline; anything else is an attachment (`src/astro/routes/api/media/file/[...key].ts`).
- Deleting a media item has no in-use guard. It removes the stored file unless another media row
  shares the key, and content keeps the stale value (`src/api/handlers/media.ts` `handleMediaDelete`).
  Pages therefore check media through `./src/lib/media.ts`.
- The storage adapter offers `exists(key)` and `download(key)`, which returns `{ body, contentType,
  size }` (`src/storage/local.ts`, `src/storage/s3.ts`).
  - A missing key throws code `NOT_FOUND`.
  - On local storage, `list` reads the whole directory.
- `Image` from `emdash/ui` builds a local URL from `meta.storageKey`, else from `id`
  (`src/media/url.ts` `buildRenderMediaUrl`). A production build authorises no media source for
  Astro's image service, so production serves originals (`src/astro/integration/index.ts`;
  ADR 0003).
- The frontend media-provider loader creates providers with an empty context, and the local provider
  needs a database, so public pages cannot use it (`src/media/provider-loader.ts`,
  `src/media/local-runtime.ts`).

## Request locals and types

- On an anonymous public request, `Astro.locals.emdash` holds only `storage`, `getPublicMediaUrl`
  and the page-contribution hooks. A signed-in request gets every handler. It is undefined when
  runtime init failed (`src/astro/middleware.ts`).
- `emdash/locals` (`locals.d.ts`) types `App.Locals`. `./src/env.d.ts` references it, because the
  generated `emdash-env.d.ts` is not kept.

## Admin input

- A datetime field is a UTC instant. The Admin edits it as `<input type="datetime-local">` in the
  site's `timezone` setting and saves canonical UTC ISO (`@emdash-cms/admin/dist/index.js`
  1.1.0, the region bundled from its src/lib/datetime-local.ts).

## Head, settings, menus, sitemap

- `EmDashHead` emits the description, canonical, OG and Twitter tags, the default OG image and the
  favicon. It lays the entry's SEO panel over what the page passes, and the `<title>` stays the
  page's own (`src/components/EmDashHead.astro`, `src/page/seo-contributions.ts`). `getSeoMeta`
  falls back to `data.excerpt` (`src/seo/index.ts`).
- Site settings accept a fixed key set (`src/api/schemas/settings.ts`). Their `seo` object is
  patched key by key, and `null` removes a key (`src/settings/index.ts`). Plugin `settingsSchema`
  fields are string, number, boolean, select, secret, url or email (`src/plugins/types.ts`).
- Menu items carry `referenceCollection` and `referenceId`. A menu returns only label, URL, target
  and titleAttr, and does not check publication (`src/api/schemas/menus.ts`, `src/menus/index.ts`).
  `resolveEmDashPath` maps a URL back to its entry (`src/query.ts`).
- The sitemap lists routable collections with SEO enabled (`src/api/handlers/seo.ts`).

## Search and seeding

- Full-text search is SQLite-only: `enableSearch` throws on PostgreSQL (`src/search/fts-manager.ts`;
  ADR 0002).
- Seed taxonomy terms are applied only with content (`src/seed/apply.ts`), and `emdash seed` opens
  SQLite only (`src/cli/commands/seed.ts`). The model-update step uses the schema and taxonomy APIs
  instead (`./scripts/model-update.mjs`).
- An API token reads `/_emdash/api/taxonomies` with the `content:read` scope and creates terms with
  `taxonomies:manage` (`src/astro/middleware/auth.ts`). A term list is a tree for a hierarchical
  taxonomy, and `?includeCounts=false` skips the per-term counts (`src/api/handlers/taxonomies.ts`
  `handleTermList`, `src/api/schemas/taxonomies.ts` `termListQuery`).

## Native API for tests

- `POST …/content/{collection}/{id}/publish` accepts `publishedAt` to backdate a publication
  (`src/astro/routes/api/content/[collection]/[id]/publish.ts`).
- `POST …/preview-url` mints a draft's signed preview link
  (`src/astro/routes/api/content/[collection]/[id]/preview-url.ts`).
- A create takes `references: { field: [id] }` and `taxonomies: { name: [slug] }`. Terms are created
  and deleted at `/_emdash/api/taxonomies/{name}/terms[/{slug}]`. `./tests/browser/cms.helpers.ts`
  wraps all of these.
- `GET …/content/{collection}/{id}` takes an id or a slug, and finds only an entry outside the trash
  (`src/api/handlers/content.ts` `handleContentGet`, `src/database/repositories/content.ts`
  `findByIdOrSlug`).
- A term list counts each term's entries as the public site sees them: published, or scheduled and
  due, and not in the trash (`src/api/handlers/taxonomies.ts` `handleTermList`,
  `src/taxonomies/term-counts.ts` `fetchVisibleTermCounts`).

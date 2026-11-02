# EmDash 1.1.0: verified behaviour

Facts the Songhealth pages and tests rely on, read from the installed package. Add a new fact under
its topic with its source path, relative to `node_modules/emdash/`. Write a Songhealth file with a
leading `./` and another package's file from its package name. When the pinned version changes,
re-verify every line and rename this file: `./tests/node/package-facts.test.ts` checks that every
cited file exists and that the name carries the pinned version.

## Public reads

- `getEmDashCollection` and `getEmDashEntry` return published entries, so pages pass no status.
  `getEmDashEntry` returns a draft only with a valid signed preview token or in edit mode
  (`src/query.ts` `resolveEmDashEntry`). A `getEmDashCollection` read stays published-only even
  then: it passes the filter's own `status`, and the loader defaults it to `"published"`
  (`src/query.ts` `getEmDashCollectionUncached`, `src/loader.ts`). `./src/lib/search.ts` relies on
  it.
- A failed read answers an error instead of throwing: `getEmDashCollection` gives
  `{ entries: [], error }`, and `getEmDashEntry` gives `{ entry: null, error }`, where `error` stays
  unset when the entry simply does not exist (`src/query.ts` `EntryResult`,
  `getEmDashCollectionUncached`; `src/loader.ts`). A read that ignores `error` shows an empty list or
  the 404 page instead of failing, so every read checks it. `./src/lib/search-matcher.ts`
  `searchOutcome` turns it into the search's failed state.
- A signed preview link carries its token in the `_preview` query parameter
  (`src/preview/tokens.ts`), so a redirect that keeps the query string keeps the preview
  (`./src/pages/pages/[slug].astro`).
- An entry's `id` is its slug and `data.id` is the database id. Taxonomy terms hydrate as
  `data.terms[taxonomy]`, ordered by label.
- A collection's `urlPattern` takes `{name}` placeholders, one per path segment
  (`src/schema/url-pattern.ts` `compileUrlPattern`). The resolver matches the path against every
  pattern and then loads the entry by the `slug` placeholder alone; another placeholder's value is
  not checked against the entry (`src/query.ts`, the lookup under `urlPatternCache`). The Admin's
  view link, the preview URL and the sitemap build an entry's address from the pattern.
- `data.publishedAt` keeps the first publication's time: a republish keeps the current value unless
  the request sets one (`src/database/repositories/content.ts` `publish`, `intendedPublishedAt`).
  `data.updatedAt` moves on every publish and also when staff save a draft of a published entry,
  because the draft revision's pointer sits on the same row (same file, the statement that sets
  `draft_revision_id` beside `updated_at`). A public read strips the revision pointers
  (`src/query.ts` `stripRevisionMetadata`), so neither value says when the live version last
  changed.
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
- The object cache, a read-through cache of collection and entry reads, is off unless the
  integration configures `objectCache`; then `cachedQuery` only calls the loader
  (`src/object-cache/index.ts`, `src/query.ts` `loadCollectionCached`). `./astro.config.mjs`
  configures none, so every read reaches the database, and a search sees an unpublish at once.
- A boolean field is an `INTEGER` column, and the query functions hydrate it as `true`/`false`
  (`src/loader.ts` `mapRowToData`). A boolean `where` value binds as 1 or 0
  (`bindableFilterValue`), but the `WhereValue` type admits only strings, so
  `./src/lib/personnel-directory.ts` filters `public_visible` in code.
- An entry without a slug, such as a non-routable Personnel entry, takes its database id as its
  `id` (`src/loader.ts` `entryIdForRow`).
- A `number` field is a `REAL` column (`src/schema/types.ts` `FIELD_TYPE_TO_COLUMN`), which is
  `float4` on PostgreSQL: about 7 significant digits. A Thai longitude keeps 5 decimal places
  (`100.1234567` reads back as `100.12346`, about 1 m), enough for a map link.
- No query returns distinct values or a count: a collection read answers its entries and, with a
  `limit`, whether more remain (`src/query.ts` `CollectionResult`). `./src/lib/documents.ts`
  `fiscalYears` walks down instead, and `./src/lib/moits.ts` reads every published MOIT for the ITA
  landing's years and counts.
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
- An image block in a Portable Text body, as the Admin editor saves a picked media item, is
  `{ _type: "image", asset: { _ref: mediaId, url }, alt }`, where `url` is the media item's
  `/_emdash/api/media/file/{storageKey}` (`src/content/converters/prosemirror-to-portable-text.ts`
  `convertImage`, `src/astro/routes/api/media.ts` `addUrlToMedia`). A gallery block holds such
  images in `images`. The renderer takes `asset.url`, else a URL from `asset.meta.storageKey`, else
  the media id (`src/content/converters/gallery.ts` `resolveImageMedia`, `src/media/url.ts`
  `buildRenderMediaUrl`). `./src/lib/media.ts` `availableBody` reads the key the same way.
- In edit mode the query functions tag a Portable Text array with non-enumerable edit metadata,
  and `PortableText` then renders the inline editor instead of HTML (`src/query.ts`
  `tagEditableFields`, `getEditMeta`; `src/components/PortableText.astro`). A copied or filtered
  array loses the tag, so `./src/components/RichText.astro` passes a tagged body unchanged.
- `/_emdash/api/media/file/{key}` serves the stored file by key. Safe image, video and audio types
  are served inline; anything else is an attachment (`src/astro/routes/api/media/file/[...key].ts`).
- Deleting a media item has no in-use guard. It removes the stored file unless another media row
  shares the key, and content keeps the stale value (`src/api/handlers/media.ts` `handleMediaDelete`).
  Pages therefore check media through `./src/lib/media.ts`.
- EmDash tracks where a media item is used, in fields of every kind including blocks:
  `GET /_emdash/api/media/{id}?includeUsage=1` adds a usage summary and
  `GET /_emdash/api/media/{id}/usage` lists the entries and fields
  (`src/astro/routes/api/media/[id].ts`, `src/astro/routes/api/media/[id]/usage.ts`,
  `src/api/handlers/media-usage.ts`, `src/media/usage/content-fields.ts`). The Admin's media
  dialog shows it as a "Used in" tab, after a setup that indexes existing content, and the
  delete button sits beside it: the usage informs, it does not block (observed on the development
  runtime, 2026-11-02).
- The storage adapter offers `exists(key)` and `download(key)`, which returns
  `{ body, contentType, size }` (`src/storage/local.ts`, `src/storage/s3.ts`).
  - A missing key throws code `NOT_FOUND`.
  - On local storage, `list` reads the whole directory.
- `Image` from `emdash/ui` builds a local URL from `meta.storageKey`, else from `id`
  (`src/media/url.ts` `buildRenderMediaUrl`). A production build authorises no media source for
  Astro's image service, so production serves originals (`src/astro/integration/index.ts`;
  ADR 0003).
  - Only `astro dev` registers the host-agnostic pattern `{ pathname: "/_emdash/api/media/file/**" }`.
    A build registers the storage's `publicUrl` host, which local storage lacks, and the site's
    origin only when the site URL is known at build time (`src/astro/integration/index.ts`
    `buildImageRemotePatterns`).
  - EmDash wraps Astro's `/_image` endpoint. For an `href` under `/_emdash/api/media/file/` with a
    key of `[A-Za-z0-9._-]`, it reads the bytes from storage and never fetches the URL. Any other
    `href`, and any `href` while storage is unavailable, goes to Astro's stock
    `astro/assets/endpoint/generic` (`src/astro/image-endpoint.ts`, `src/media/image-endpoint.ts`
    `matchInternalMediaKey`). The production container therefore
    answers `/_image` for media with a sharp rendition, though its pages never ask for one (#67
    comment 6558376075).
- `Image` loads lazily unless given `priority`, which makes it eager and adds
  `fetchpriority="high"`. The attributes it is given come after that default, so a passed `loading`
  wins (`src/components/EmDashImage.astro`). `./src/components/ContentCard.astro` and
  `./src/components/ActivityCard.astro` load a list's first row that way.
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
- A repeater sub-field is a string, text, url, number, integer, boolean, datetime, select or image.
  A repeater holds no file, no reference and no nested repeater (`src/schema/types.ts`
  `REPEATER_SUB_FIELD_TYPES`).
- A `blocks` field holds an ordered list of typed blocks, at most 100 (`src/schema/types.ts`
  `MAX_BLOCKS_ITEMS`; `src/schema/registry.ts` rejects a `maxItems` outside 1–100). A block type's
  fields can be string, text, url, number, integer, boolean, datetime, select, multiSelect,
  portableText, image, file or repeater, never a reference (`src/schema/block-types.ts`
  `BLOCK_FIELD_TYPES`). A seed can define block types (`src/seed/types.ts` `blockTypes`).
- The Admin edits a blocks field as a list: staff add a block from a picker of the allowed types,
  grouped by category, and reorder blocks by dragging (`@emdash-cms/admin/dist/index.js`
  `BlocksField`). It reads the types from `GET /_emdash/api/schema/block-types` (same file,
  `fetchBlockTypes`). A block's own fields render through the same `FieldRenderer` as a
  collection's fields, so a file field inside a block gets the same picker as a Document's file
  (same file, the `renderField` that `BlocksField` receives).
- `POST /_emdash/api/schema/block-types` creates a block type and `PUT …/block-types/{slug}`
  updates one (`src/astro/routes/api/schema/block-types/index.ts`,
  `src/astro/routes/api/schema/block-types/[slug]/index.ts`). `./scripts/model-update.mjs` calls
  both.
  - The create body takes a slug, a label, a description, an icon, a category and the fields, and
    no source, so a type made through the API is a `user` type, where setup's seed makes `seed`
    ones (`src/api/schemas/schema.ts` `createBlockTypeBody`, `src/schema/block-type-registry.ts`
    `createBlockType`, `applySeedBlockType`). Both routes parse the fields with
    `blockFieldDefinitionSchema` (`src/astro/routes/api/schema/block-types/index.ts` `parseBody`),
    and a version stores them as parsed. EmDash's own zod 4.5.4 gives an object's keys in its
    shape's order (`node_modules/zod/v4/core/schemas.js`, the `allKeys` of `$ZodObject`), so a
    type made through the API returns its fields' keys in that order, not in the order they were
    sent in; a type setup made keeps the seed's order (`validateBlockFields` returns each field
    unchanged).
  - A version's fingerprint hashes each field's slug, type, required flag, default, validation
    and options, but no label (`src/schema/block-type-contract.ts` `fingerprintBlockFields`).
  - The update names the active version's fingerprint as `expectedFingerprint` and answers
    `CONFLICT` once that version has changed. A compatible change rewrites the active version in
    place. A breaking one answers `BLOCK_TYPE_BREAKING_CHANGE` unless the body sets `breaking`:
    a field removed or retyped, a required field added, a field made required, or a constraint
    narrowed, such as a select option removed (`src/schema/block-type-registry.ts`
    `updateBlockType`, `src/schema/block-type-contract.ts` `compareBlockFields`). With
    `breaking`, it adds a version and leaves the current one active. A version becomes current
    through `POST …/block-types/{slug}/versions/{version}/activate`
    (`src/astro/routes/api/schema/block-types/[slug]/versions/[version]/activate.ts`,
    `activateVersion` in the registry).
- A blocks field cannot be required, unique, indexed or searchable, and every type it allows must
  exist when it is created or changed. EmDash stores its validation completed as `allowedTypes`,
  `retiredTypes`, `minItems` and `maxItems`, and a type taken out of `allowedTypes` moves to
  `retiredTypes` (`src/schema/registry.ts` `normalizeBlocksFieldValidation`).
- The Admin's block picker lists a field's allowed types in their `allowedTypes` order, grouped by
  category, each with its label and description; it shows no icon. A new block starts with each
  field's `defaultValue` (`@emdash-cms/admin/dist/index.js` `BlocksField`, `createBlockValue`).
- A file value inside a block is normalised on save like a file field, and an image like an image
  field (`src/emdash-runtime.ts`, the block-field loop beside the repeater one,
  `normalizeMediaValue` and `normalizeImageValue`).
- A block's fields are validated when an entry is created or updated, and when the seed is
  applied, with the same schema as a collection's fields, against the version the block names; a
  field the version does not declare is refused (`src/emdash-runtime.ts` and `src/seed/apply.ts`
  call `normalizeBlocksData`; `src/schema/block-values.ts` `blockSchema`,
  `src/schema/zod-generator.ts` `generateBlockFieldSchema`). So a `url` saved there takes only an
  address that `isSafeHref` passes, and a `select` only one of its version's options. A transfer
  import checks a url inside a block with the looser `isSafeUrlFieldWriteValue` instead, which
  takes `example.com` or `?q=1` (`src/transfer/analyze/values.ts` `checkContentUrlFields`).
  `./src/lib/ita.ts` checks a link's address itself for that reason.
- `POST /_emdash/api/content/{collection}/{id}/duplicate` copies an entry as a draft with " (Copy)"
  after its title and a fresh unique slug. It needs `content:create` and the edit permission on the
  source (`src/astro/routes/api/content/[collection]/[id]/duplicate.ts`,
  `src/database/repositories/content.ts` `duplicate`).
- The Admin's Portable Text editor saves paragraphs, headings, bullet and numbered lists, quotes,
  code, HTML and iframe blocks, images, galleries, tables and rules. A link is a mark with an
  `href`, and there is no file block (`src/content/converters/prosemirror-to-portable-text.ts`).
- A collection, field or block-type slug matches `^[a-z][a-z0-9_]*$`: no hyphen
  (`src/api/schemas/common.ts` `slugPattern`). An entry's slug keeps its hyphens and is unique
  within its collection (`src/database/repositories/content.ts` `generateUniqueSlug`,
  `SLUG_CONFLICT`).
- A block posted without `_key` and `_version` is accepted when the entry is created: it gets a
  key and the type's current version. An update of a blocks field that already has blocks must
  carry their keys, or set `replaceBlocks` (`src/schema/block-values.ts` `normalizeBlockArray`).
- In the Admin, every block of a blocks field renders expanded. Each block has a header with its
  type's label, its version and its first field's value, and "Collapse block", "Duplicate block"
  and "Delete block" buttons; a collapsed block is expanded again after a reload. A `select` field
  renders as a combobox with the field's options and no empty choice, so a chosen value cannot
  be cleared (`@emdash-cms/admin/dist/index.js`; observed on the development runtime,
  2026-11-02, ITA prototype).
- The content list's row actions include Duplicate, which makes the draft copy that the duplicate
  endpoint makes: a blocks field is copied with its file values
  (`@emdash-cms/admin/dist/index.js`; observed 2026-11-02).

## Head, settings, sitemap

- `EmDashHead` emits the description, canonical, OG and Twitter tags, the default OG image and the
  favicon. It lays the entry's SEO panel over what the page passes, and the `<title>` stays the
  page's own (`src/components/EmDashHead.astro`, `src/page/seo-contributions.ts`). `getSeoMeta`
  falls back to `data.excerpt` (`src/seo/index.ts`). No head or SEO code reads the site tagline
  (nothing under `src/page/`, `src/seo/` or `src/components/`), so a page's description is only
  what the page or the entry's SEO panel gives.
- Site settings accept a fixed key set (`src/api/schemas/settings.ts`). Their `seo` object is
  patched key by key, and `null` removes a key (`src/settings/index.ts`). Plugin `settingsSchema`
  fields are string, number, boolean, select, secret, url or email (`src/plugins/types.ts`).
- The sitemap lists routable collections with SEO enabled (`src/api/handlers/seo.ts`). Its
  addresses start from the settings' `url`, else the configured origin (the integration's `siteUrl`,
  then `EMDASH_SITE_URL` or `SITE_URL`), else the request's own (`src/astro/routes/sitemap.xml.ts`,
  `src/api/public-url.ts` `getPublicOrigin`). `./src/lib/site-identity.ts` follows the settings,
  `EMDASH_SITE_URL`, then the request, which agrees while neither `siteUrl` nor `SITE_URL` is set.
- EmDash builds and renders no breadcrumb. `createPublicPageContext` takes an optional
  `breadcrumbs` trail (`{ name, url }` items, root first), which plugins' page hooks receive, so an
  SEO plugin can emit a `BreadcrumbList` from it: `[]` means the page has none, and an omitted
  field lets the plugin derive its own. Nothing in core reads it (`src/page/context.ts`,
  `src/plugins/types.ts` `PublicPageContext`).

## Menus

- A menu has a name and a label, and no description (`src/api/schemas/menus.ts` `createMenuBody`,
  `src/menus/types.ts` `MenuRow`). The Admin's Menus screen lists each menu's label, name and item
  count (`@emdash-cms/admin/dist/index.js` `MenuCard`).
- Menu items carry `referenceCollection` and `referenceId`. `getMenu(name)` returns a menu's items
  as a tree, each with its label, URL, target, titleAttr and `children`, and checks no
  publication: a content item keeps its URL while its entry is a draft or in the trash, and only a
  permanently deleted entry drops it (`src/menus/index.ts` `resolveContentReferences`,
  `resolveMenuItem`).
- A content item's URL is its collection's `urlPattern` with the slug encoded by
  `encodeURIComponent` (`src/i18n/resolve.ts` `interpolateUrlPattern`).
- `resolveEmDashPath(path)` matches a path against each collection's `urlPattern` and reads the
  slug it captures with `getEmDashEntry`, unchanged, so it finds only a published entry, and an
  encoded slug must be decoded first, as `decodeSlug` does (`src/query.ts`,
  `src/utils/slugify.ts`). It answers `null` alike for a path no pattern matches, such as a page of
  the site, and for one whose entry is not published, and it ignores that read's `error`, so a
  failed read resolves to nothing. `./src/lib/homepage-curation.ts` maps the Homepage menus' items
  through it, and `./src/lib/homepage-menus.ts` lists the site's own pages beside it.
- The Admin menu editor adds content through a picker that browses every collection, one entry at
  a time, and saves the entry as a `collection` item (`page` for `pages`) with the entry's id
  (`@emdash-cms/admin/dist/index.js` `ContentPickerModal`, `handleAddContent`).
- The REST API lists and creates menus at `/_emdash/api/menus`, reads, relabels and deletes one at
  `/_emdash/api/menus/{name}` (`PUT` changes only the label), adds an item with `POST` to
  `/_emdash/api/menus/{name}/items`, and changes or deletes one at
  `/_emdash/api/menus/{name}/items/{id}` (`src/astro/routes/api/menus/index.ts`,
  `src/astro/routes/api/menus/[name].ts`, `src/astro/routes/api/menus/[name]/items.ts`,
  `src/astro/routes/api/menus/[name]/items/[id].ts`).
  A token reads them with `content:read` and writes with `menus:manage`, which `content:write`
  grants (`src/astro/middleware/auth.ts`, `@emdash-cms/auth/src/tokens.ts`). A second menu of the
  same name answers `CONFLICT` (`src/api/handlers/menus.ts` `handleMenuCreate`). Only the MCP
  server replaces a menu's items at once (`src/mcp/server.ts`, `handleMenuSetItems`), so a test
  that sets a menu deletes and recreates its items, which get new ids
  (`./tests/browser/cms.helpers.ts` `showHomepageMenus`).
- On PostgreSQL, deleting a menu item deletes its children. `DELETE …/items/{id}` deletes the one
  row (`src/database/repositories/menu.ts` `deleteItem`), and `parent_id` references the parent
  item `ON DELETE CASCADE` (`src/database/migrations/005_menus.ts`). Only the SQLite rebuild drops
  that key (`src/database/migrations/036_i18n_menus_and_taxonomies.ts`).
- Applying the seed recreates the items of every menu it declares: an existing menu loses its
  items (`src/seed/apply.ts`, the menus step). `setup/dev-bypass` applies the seed on every call
  (`src/astro/routes/api/setup/dev-bypass.ts`), while `POST /_emdash/api/setup` refuses once setup
  is complete (`src/astro/routes/api/setup/index.ts`).

## Plugins and plugin settings

- A native plugin is a `plugins: []` entry of the `emdash()` integration with an `entrypoint` that
  exports `createPlugin()`, which returns `definePlugin({ id, version, admin })`
  (`src/astro/integration/runtime.ts` `PluginDescriptor`, `src/astro/integration/virtual-modules.ts`
  `generatePluginsModule`, `src/plugins/define-plugin.ts`). The id is lowercase letters, digits and
  dashes. A configured plugin with no stored state counts as active (`src/api/handlers/plugins.ts`
  `buildPluginInfo`). `./src/plugins/office-contact.ts` is one.
- The Admin generates a settings form from `admin.settingsSchema` at
  `/_emdash/admin/plugins-manager/{id}/settings`, and saves an emptied field as `null`
  (`@emdash-cms/admin/dist/index.js`, `PluginSettings`). `PUT` with `null` deletes the stored value
  (`src/api/handlers/plugin-settings.ts`). A `url` field is checked only with `URL.canParse`, so
  any scheme passes, and an `email` field only for an "@".
- `GET` and `PUT /_emdash/api/admin/plugins/{id}/settings` need `plugins:manage`, which only the
  Administrator role holds; an Editor has `plugins:read`, enough for `GET /_emdash/api/admin/plugins`
  (`src/astro/routes/api/admin/plugins/[id]/settings.ts`, `@emdash-cms/auth/src/rbac.ts`). A token
  also needs the `admin` scope for any `/_emdash/api/admin` route (`src/astro/middleware/auth.ts`).
- `getPluginSettings(id)` returns the stored values only, without the schema's defaults
  (`src/settings/index.ts`).
- The site settings' `social` fields hold handles, not addresses: the Admin asks for an X handle,
  a Facebook page username, a YouTube channel ID or handle (`@emdash-cms/admin/dist/index.js`).
  The settings API patches `social` key by key and accepts only strings, so a handle can be
  emptied but not deleted (`src/settings/index.ts` `setSiteSettings`, `src/api/schemas/settings.ts`).
  The networks are twitter, github, facebook, instagram, linkedin and youtube; LINE is not one
  (`src/settings/types.ts`).

## Traceability

What EmDash records about who changed what, and when (#115; ADR 0005 builds on it).

- A publish records its time in `published_at` but not who published: after the route's permission
  check, `handleContentPublish` drops the `actor`
  (`src/astro/routes/api/content/[collection]/[id]/publish.ts`, `src/emdash-runtime.ts`). A publish promotes the draft revision, whose author is whoever saved it
  last, or creates a revision with no author when there is no draft
  (`src/database/repositories/content.ts` `publish`). Each save writes a revision with its author
  and time (`src/database/repositories/revision.ts`).
- The `content:beforePublish` policy hook receives the `actor` and the `origin`, but
  `content:afterPublish` receives neither. No plugin hook exists for schema, settings or user
  changes (`src/plugins/types.ts` `ContentPolicyEvent`, `ContentStateChangeEvent`, `PluginHooks`).
- Collections keep `created_at` and `updated_at`, and fields only `created_at`
  (`src/database/migrations/003_schema_registry.ts`). Menus keep both
  (`src/database/migrations/036_i18n_menus_and_taxonomies.ts`). Site settings (`site:` keys) and
  plugin settings are rows of the `options` table, which holds only a name and a value
  (`src/settings/index.ts`, `src/api/handlers/plugin-settings.ts`,
  `src/database/migrations/001_initial.ts`). None of them records who made the change.
- A role change and a disable go through `updateUser`, which sets `updated_at` with the new values
  and keeps neither the old value nor the actor (`src/astro/routes/api/admin/users/[id]/index.ts`,
  `src/astro/routes/api/admin/users/[id]/disable.ts`, `@emdash-cms/auth/src/adapters/kysely.ts`).
  A disable also deletes the user's OAuth tokens. An invite's row keeps `invited_by` and the role
  (`src/database/migrations/008_auth.ts`) and is deleted once the invite is accepted
  (`@emdash-cms/auth/src/invite.ts`). Revoking an API token deletes its row
  (`src/api/handlers/api-tokens.ts`).
- No route revokes a pending invite. The invite routes create one with `POST`, then answer
  `GET …/accept`, `POST …/complete` and `POST …/register-options`
  (`src/astro/integration/routes.ts`). The row stays in `auth_tokens` until the invite is accepted, so a task that creates an invite
  deletes its row with SQL by the invite's email. The row's `expires_at` is text
  (`src/database/migrations/008_auth.ts`).
- In development, with no other email provider, the console email provider writes each email to
  standard output, an invite's link and token included, so they reach the app's journal
  (`src/plugins/email-console.ts`). With no provider configured, the invite route returns the link
  in its answer instead (`src/astro/routes/api/auth/invite/index.ts`).
- Each media item keeps `author_id` and `created_at` (`src/database/migrations/001_initial.ts`).
  The Admin takes and refreshes an entry's edit lock with `POST …/lock` and releases it with
  `DELETE` (`src/astro/routes/api/content/[collection]/[id]/lock.ts`).
- The `audit_logs` table has an actor, an IP, an action, a resource, details and a status
  (`src/database/repositories/audit.ts`). EmDash writes it only for plugin MCP tool calls and
  transfers (`src/emdash-runtime.ts` `handlePluginMcpTool`, `src/transfer/audit.ts`). No route reads
  it, and the package's exports leave out its repository. The development runtime held no rows on
  2026-11-01.
- The publish, schema, settings, user and token routes write no log line. Only `dev-bypass` and the
  first admin's OAuth setup do (`src/astro/routes/api/auth/dev-bypass.ts`).
- EmDash adds its middleware with `order: "pre"` (`src/astro/integration/index.ts`
  `buildMiddlewareEntries`). The `middleware.outer` option adds a project middleware ahead of it,
  which wraps the whole EmDash pipeline (`src/astro/integration/runtime.ts`).
  `./src/middleware/admin-change-log.ts` uses it (#115 comment 6559591057).
- EmDash's auth middleware answers some refusals itself, without calling `next()`: 401 for no
  session or an invalid token, and 403 for a missing `X-EmDash-Request` header, a token's scope or
  a disabled account (`src/astro/middleware/auth.ts`). A signed-in request has `locals.user` set
  by the time `next()` resolves.
- `./src/lib/admin-change-log.ts` names routes by the patterns EmDash injects, such as
  `/_emdash/api/content/[collection]/[id]/lock` (`src/astro/integration/routes.ts`).
- On local storage the Admin uploads a new media item in three requests: `POST …/media/upload-url`
  creates a pending item, then `PUT …/media/{id}/upload` and `POST …/media/{id}/confirm`.
  `POST /_emdash/api/media` uploads one directly (`src/astro/routes/api/media/upload-url.ts`,
  `src/storage/local.ts` `getSignedUploadUrl`, `src/astro/routes/api/media.ts`).
- The MCP endpoint at `/_emdash/api/mcp` is on unless the integration sets `mcp: false`, and it
  takes bearer tokens only (`src/astro/integration/runtime.ts`). Its tools include
  `content_publish`, `schema_create_field`, `schema_delete_collection`, and taxonomy and menu
  changes (`src/mcp/server.ts`).

## Search and seeding

- Full-text search is SQLite-only: `enableSearch` throws on PostgreSQL (`src/search/fts-manager.ts`;
  ADR 0002).
- `extractPlainText` reads Portable Text: the span text of each block that has `children`, through
  `@portabletext/toolkit`'s `toPlainText`, which skips any other
  (`@portabletext/toolkit/dist/index.js` `isPortableTextBlock`; EmDash asks for `^5.0.1`, and
  `./package-lock.json` holds 5.0.2), and of the custom blocks a `code` block's code and an `image`
  block's alt and caption (`src/search/text-extraction.ts` `extractCustomBlockText`). It reads
  nothing of a `blocks` field's typed blocks, such as an Evidence block's label, so
  `./src/lib/ita.ts` `evidenceLabels` gives the search those labels.
- Seed taxonomy terms are applied only with content (`src/seed/apply.ts`), and `emdash seed` opens
  SQLite only (`src/cli/commands/seed.ts`). The model-update step uses the schema and taxonomy APIs
  instead (`./scripts/model-update.mjs`).
- Setup applies the seed with `onConflict: "skip"`, so a collection that exists keeps its settings
  (`src/astro/routes/api/setup/index.ts`). `emdash schema` lists, gets, creates and deletes
  collections and adds or removes fields, but cannot update a collection
  (`src/cli/commands/schema.ts`).
- `GET` and `POST /_emdash/api/schema/collections/{slug}/fields` list and create a collection's
  fields (`src/astro/routes/api/schema/collections/[slug]/fields/index.ts`). The create body takes a
  seed field's own keys (`src/seed/types.ts` `SeedField`, beside `SeedCollection` with its
  `urlPattern` and `SeedTaxonomyTerm`), and the collection list carries no fields (`src/api/schemas/schema.ts`
  `createFieldBody`, `src/api/handlers/schema.ts` `handleSchemaCollectionList`). A created field
  goes after the existing ones (`src/schema/registry.ts` `createField`). `PUT` on
  `…/fields/{field}` updates one
  (`src/astro/routes/api/schema/collections/[slug]/fields/[fieldSlug].ts`).
- `POST /_emdash/api/schema/collections` creates a collection without fields and takes no title or
  date field, which only the update sets (`src/api/schemas/schema.ts` `createCollectionBody`,
  `updateCollectionBody`). Setup creates a seed collection with the source `seed` and sets those
  two in a second write, once the fields exist (`src/seed/apply.ts` `applyDisplayDateFields`).
  They are the only fields of its own a collection's Admin list can sort by
  (`src/api/handlers/content.ts`, the `sortableExtras` of the list handler).
- An `integer` field is an `INTEGER` column that takes whole numbers only (`src/schema/types.ts`
  `FIELD_TYPE_TO_COLUMN`, `src/schema/zod-generator.ts`). On PostgreSQL that is the 32-bit
  `integer` type (`src/schema/registry.ts` `COLUMN_TYPE_TO_DATA_TYPE`; `src/transfer/analyze/values.ts`
  `INT4_MAX`), which holds any whole number of up to nine digits; `./src/lib/ita.ts`
  `fiscalYearOf` reads a fiscal year of that length from an address.
- An API token reads `/_emdash/api/taxonomies` with the `content:read` scope and creates terms with
  `taxonomies:manage` (`src/astro/middleware/auth.ts`). A term list is a tree for a hierarchical
  taxonomy, and `?includeCounts=false` skips the per-term counts (`src/api/handlers/taxonomies.ts`
  `handleTermList`, `src/api/schemas/taxonomies.ts` `termListQuery`).

## Native API for tests

- A native list answers one page of at most 100 items (`limit`), with `nextCursor` while more remain
  (`src/api/schemas/common.ts` `cursorPaginationQuery`).
- `POST …/content/{collection}/{id}/publish` accepts `publishedAt` to backdate a publication
  (`src/astro/routes/api/content/[collection]/[id]/publish.ts`).
- `POST …/preview-url` mints a draft's signed preview link
  (`src/astro/routes/api/content/[collection]/[id]/preview-url.ts`).
- A slug change adds a 301 redirect from the old address with `auto: true`
  (`src/database/repositories/redirect.ts`). `GET /_emdash/api/redirects` lists redirects and
  takes `search` and `limit`; each item carries `id`, `source` and `auto`.
  `DELETE /_emdash/api/redirects/{id}` removes one (`src/astro/routes/api/redirects/index.ts`,
  `src/astro/routes/api/redirects/[id].ts`, `src/api/schemas/redirects.ts`).
  `./tests/browser/cms.helpers.ts` `deleteAutoRedirects` removes the ones a suite's slug changes
  left.
- `GET /_emdash/api/redirects/404s` lists the 404 log. With `redirects:manage`, `DELETE` on it
  clears the whole log and answers `{ deleted }`, and `POST` with `olderThan` prunes it by age; no
  entry can be removed alone (`src/astro/routes/api/redirects/404s/index.ts`,
  `src/api/handlers/redirects.ts` `handleNotFoundClear`).
  `./scripts/dev-runtime-residue.sh --clear-404-log` calls the `DELETE`.
- A 404 log entry keeps the missed path without its query string, with the request's `Referer` and
  `User-Agent`, and the list answers them as `referrer` and `userAgent`. A repeated miss of one path
  adds a hit and keeps the latest referrer (`src/astro/middleware/redirect.ts`,
  `src/database/repositories/redirect.ts` `log404`). EmDash reads `Referer` nowhere else but an
  OAuth error redirect and the request metadata it hands plugins, never for an access decision
  (`src/astro/routes/api/auth/oauth/[provider].ts`, `src/plugins/request-meta.ts`).
  `./playwright.config.ts` sends a `songhealth-unknown-` referrer with every test request, so
  `./scripts/dev-runtime-residue.sh` counts a test's miss as the tests' even where its path cannot
  carry the mark, such as a fiscal year's `/ita/2404`.
- A content API request with no token and no session is refused before its route runs. A
  state-changing one without `X-EmDash-Request: 1` answers `403 CSRF_REJECTED`; any other answers
  `401 NOT_AUTHENTICATED` (`src/astro/middleware/auth.ts`). The development runtime answered both
  on 2026-10-30. A request with a Bearer token skips that header check, since a token is not an
  ambient credential (same file, `handleBearerAuth`). Public API routes check CSRF by `Origin` instead (`src/api/csrf.ts`
  `checkPublicCsrf`). `./tests/browser/cms.helpers.ts` `anonymousRequest` sends no such header.
- A create takes `references: { field: [id] }` and `taxonomies: { name: [slug] }`. Terms are created
  and deleted at `/_emdash/api/taxonomies/{name}/terms[/{slug}]`. `./tests/browser/cms.helpers.ts`
  wraps all of these.
- `GET …/content/{collection}/{id}` takes an id or a slug, and finds only an entry outside the trash
  (`src/api/handlers/content.ts` `handleContentGet`, `src/database/repositories/content.ts`
  `findByIdOrSlug`).
- A slug stays taken while its entry is in the trash: the table's `UNIQUE (slug, locale)` covers
  trashed rows, and a create with that slug answers `409 SLUG_CONFLICT`
  (`src/database/migrations/019_i18n.ts`, `src/api/handlers/content.ts`).
  `POST …/{id}/restore` brings a trashed entry back as a draft: it clears the live revision and the
  schedule (`src/database/repositories/content.ts` `restore`). `./scripts/demo-dataset/plan.ts`
  therefore restores the dataset's trashed entries and publishes them again.
- `GET /_emdash/api/media` takes `q`, a case-insensitive part of a filename
  (`src/api/schemas/media.ts` `mediaListQuery`, `src/database/repositories/media.ts`
  `applyListFilters`).
- A term list counts each term's entries as the public site sees them: published, or scheduled and
  due, and not in the trash (`src/api/handlers/taxonomies.ts` `handleTermList`,
  `src/taxonomies/term-counts.ts` `fetchVisibleTermCounts`).

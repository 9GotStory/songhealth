// T020 — focused native revision/concurrency checks for Feature 002
// US6: the native optimistic-concurrency matrix (current/stale `_rev` for
// update and publish, concurrent saves never silently overwriting newer
// work, refusal read-backs and the re-read-before-retry discipline), the
// native revision history and selected-revision restore, the native
// autosave shape (`skipRevision`) with interrupted-edit draft recovery, the
// native edit lock (lease holder, second-writer ENTRY_LOCKED refusal, the
// documented overrideLock control and release), and the published-versus-
// pending boundary for staged content-data/reference selections — with the
// separately current taxonomy/SEO/byline metadata and shared media asset
// state observed as NOT being staged atomically with a content revision.
// Test support in tests/browser/ only: no application, schema, seed,
// dependency, infrastructure, or production change is made here, and NO
// runtime execution is claimed by authoring this file — the T022 serial
// join owns actually running these checks.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T020 ("Author native
//   revision/concurrency checks in tests/browser/cms-revisions.spec.ts for
//   current/stale `_rev`, locks, autosave/draft recovery and revision
//   restore, live versus pending content-data/reference selections, and
//   truthful uncertain-result re-reads; separately observe current
//   taxonomy/SEO/byline/shared-media behavior without an atomic staging or
//   historical-snapshot claim") and the shared "Path Conventions and Shared
//   Constraints" section (dev-bypass access discipline, distinct native
//   role credentials, returned IDs/current `_rev`, re-read uncertain
//   outcomes, serial runtime checks, clean only owned synthetic fixtures)
// - specs/002-cms-content-model/spec.md — US6 acceptance scenarios 2, 5, 6
//   (staged content-data edits keep the previous live content-data revision
//   public until authorized publication, with no promise that shared media,
//   linked records or separately maintained taxonomy/SEO/byline metadata
//   are staged/frozen atomically with it; stale/conflicting saves never
//   silently overwrite newer work and supported revision review/restore and
//   autosave/draft recovery remain usable; failed or uncertain outcomes are
//   never falsely reported and current state is re-read before a retry),
//   FR-022 (staging limits), FR-024 (supported revisions/autosave/draft
//   recovery/locks/concurrency), FR-026 (truthful outcomes), SC-005/SC-006
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes" (the latest returned `_rev` for update/publish
//   preconditions; re-read uncertain results), "Outcomes and Revision
//   Limits" (published content-data/reference edits stage under native
//   revisions while taxonomy/SEO/byline side writes and shared asset
//   changes are not frozen with them; no custom hook fixtures)
// - specs/002-cms-content-model/plan.md and data-model.md — native
//   revisions/drafts/preview/scheduling enabled on the content collections;
//   saved content-data and reference changes stage in native revisions
// - specs/002-cms-content-model/research.md §3 — revision staging and
//   finite native revision pruning as the traceability baseline
// - specs/002-cms-content-model/evidence/T018-us2-reuse.md — the applied
//   live schema standing (all eight US1+US2 collections active with their
//   `supports` and reference bindings) and the pinned-toolchain facts;
//   T001-development-inputs.md §6 — the distinct-role fixture input
//   truthfully recorded as missing at this baseline, which the prerequisite
//   gating below reports rather than invents
// - tests/browser/cms.helpers.ts — the accepted T002 native request/fixture
//   helpers this file consumes (loadDevAccessToken/createPatActor
//   development-credential actors, cmsRequest as the bounded request core,
//   NATIVE_ROLES, assertDistinctActors, assertSameNativeApp, withNativeRole
//   supported-operation role phases with verified restoration, native
//   content/lifecycle request helpers, owned-fixture cleanup with
//   trash-aware reconciliation)
// - tests/browser/cms-lifecycle.spec.ts (accepted T019), cms-document.spec.ts,
//   cms-authoring.spec.ts and cms-reuse.spec.ts (accepted T003/T007/T014) —
//   the patterns this file follows: schema-readiness gating, refusal-family
//   assertions, synthetic classification-term/byline discipline, the
//   unauthenticated authorization control, failure-safe teardown, the
//   runner-configured origin, and the T013 test-authentication adaptation
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// checked first through Context7 (/websites/emdashcms — the REST reference's
// compare and edit-lock pages and the MCP "Content lifecycle and bylines"
// note that content_update/delete/publish/unpublish/schedule/unschedule/
// discard_draft and revision_restore fail with ENTRY_LOCKED while another
// user holds an entry's edit lock, with overrideLock as the documented
// write-anywhere control; /microsoft/playwright for `--list` semantics),
// then controlled by the PINNED FIRST-PARTY PACKAGE SOURCE: the `emdash@1.1.0`
// npm tarball (sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHLqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==,
// byte-equal to package-lock.json — the same integrity the T002/T003/T007/
// T014/T019 files independently verified). The unversioned docs page shows a
// `PUT .../lock` acquire; the pinned 1.1.0 route registers GET/POST/DELETE —
// the pinned source controls and this file uses POST to acquire. Facts
// actually relied on below:
// - `_rev` token (src/api/rev.ts): base64("version:updated_at"); omitted →
//   blind write; mismatch on either component → `{ success: false, error:
//   { code: "CONFLICT" } }` HTTP 409 ("Content has been modified since last
//   read (version conflict)"). Every staged data/reference save fences on
//   the row (draft CAS `version = version + 1`, src/database/repositories/
//   content.ts replaceDraftRevisionForUpdate), and publish/restore also
//   bump `version`/`updated_at`, so any newer write invalidates an older
//   token. The T002 helpers always send a `_rev` (currentRev re-read or an
//   explicit token), so nothing here relies on the blind-write path
// - draft staging (src/emdash-runtime.ts handleContentUpdate): a collection
//   with `supports: ["revisions"]` (all eight Songhealth seed collections)
//   writes content columns = published data only; each data/reference save
//   merges over the pending draft (or live base) into a NEW revision and
//   CAS-stages it as `draft_revision_id`. With `body._rev` supplied, a fence
//   failure is 409 CONFLICT; `ContentMutationConflictError` maps to 409
//   (src/api/handlers/revision.ts, src/api/error.ts mapErrorStatus).
//   CREATE stages no revision — `ContentRepository.create`
//   (src/database/repositories/content.ts:377) writes columns only, so a
//   fresh entry's revision listing is empty until its first save
// - revision history (src/database/repositories/revision.ts): a revision is
//   `{ id, collection, entryId, data, authorId, createdAt }`; `id` is a
//   monotonic ULID (version identity); `findByEntry` orders `id DESC`
//   (newest first). GET /_emdash/api/content/{collection}/{id}/revisions
//   (src/astro/routes/api/content/[collection]/[id]/revisions.ts;
//   permission content:read_drafts; `?limit=` clamped 1..100, default 50)
//   → `data { items, total }`. History is FINITELY PRUNED to the newest 50
//   per entry (pruneQueuedEntry(..., 50) — the runtime staging path and the
//   restore handler both queue it), so it is a bounded working history, NOT
//   an immutable audit archive; no restoration/retention guarantee is
//   claimed anywhere below
// - revision restore (src/astro/routes/api/revisions/[revisionId]/restore.ts;
//   src/api/handlers/revision.ts handleRevisionRestore; ContentRepository
//   restoreRevision): POST with optional body `{ overrideLock? }`;
//   permission content:edit_own/edit_any on the entry's author; claims the
//   entry lock for the write (ENTRY_LOCKED refusal possible); validates a
//   staged selection against current relation cardinality; writes the
//   snapshot's field values back into the content columns through a CAS
//   fence (version/updated_at/status/live_revision_id/draft_revision_id/
//   scheduled_at) that throws ContentMutationConflictError → 409 on a
//   concurrent mutation; inserts a restore audit revision carrying the
//   restored snapshot (authorId = the restoring caller); bumps version; and
//   releases the draft pointer back to its prior value, so with no pending
//   draft the post-restore read returns the restored data directly
// - native autosave (src/api/schemas/content.ts contentUpdateBody
//   `skipRevision: z.boolean().optional()` — "Replace the previous autosave
//   revision after staging this save"; src/emdash-runtime.ts staging: when
//   `skipRevision` is set AND a draft revision already existed, the
//   superseded autosave draft revision is deleted via deleteIfUnreferenced,
//   while ordinary saves keep their revisions, pruned to 50). There is NO
//   separate autosave endpoint and NO session-resume/recovery API in 1.1.0:
//   interrupted-edit recovery IS the persisted pending draft revision — the
//   next authorized GET returns it (hydrateDraftData). That capability
//   boundary is asserted as observed, not worked around
// - reads (src/astro/routes/api/content/[collection]/[id].ts;
//   src/emdash-runtime.ts hydrateDraftData): when `draftRevisionId` is set,
//   GET returns `item.data` = the PENDING draft data and `item.liveData` =
//   the published values; without a pending draft, `item.data` is the live
//   column data. Users without content:read_drafts get published data only
//   (draft hydration stripped)
// - compare (src/astro/routes/api/content/[collection]/[id]/compare.ts →
//   handleContentCompare): GET, content:read_drafts → `data { hasChanges,
//   live, draft }` over the live/draft REVISIONS (`live` is null before the
//   first publication); the draft side carries `_references`
//   (src/references/staged.ts STAGED_REFERENCES_KEY) = the live selection
//   overlaid with the staged one, values being native translation-group
//   ids — lengths are asserted, never decoded back to entry ids
// - publish (ContentRepository.publish, src/database/repositories/content.ts
//   :2428): promotes `draft_revision_id` → `live_revision_id`, clears the
//   draft pointer, syncs the draft revision's data into the content
//   columns, and bumps version — "If no draft revision exists, creates one
//   from current data and publishes it". A staged reference selection is
//   validated and promoted to the live links in the same publish
//   (applyStagedReferences, src/api/handlers/content.ts handleContentPublish)
// - edit locks (src/astro/routes/api/content/[collection]/[id]/lock.ts;
//   src/api/handlers/entry-lock.ts; src/database/repositories/entry-locks.ts):
//   GET reads the current holder, POST takes/refreshes the lease (optional
//   body `{ takeover?, token? }`), DELETE releases the caller's lease; all
//   three require content:edit_own/edit_any on the entry. Status data is
//   `{ enabled, holder: { userId, userName, acquiredAt, expiresAt } | null,
//   heldByCaller }`. `enabled` comes from `_emdash_collections.edit_locking`
//   (migration 075 defaults it to 1; the schema registry maps an unset
//   editLocking to 1 — every Songhealth seed collection leaves it unset, so
//   locking is ON). The lease is 7 minutes (ENTRY_LOCK_LEASE_MS), refreshed
//   by the holder's own writes (refreshHeld). A POST by a second account
//   without `takeover` is NOT an error: it returns 200 with
//   `heldByCaller: false` and the existing holder. Every write route claims
//   the lock first (claimEntryLockForWrite): another holder's enforceable
//   lease → 409 ENTRY_LOCKED naming the holder (src/api/errors.ts maps
//   ENTRY_LOCKED to 409); `overrideLock: true` is the SCHEMA-DOCUMENTED
//   write-anyway control (contentUpdateBody overrideLockFlag), not a bypass
//   invented here. A write never takes a lock it was not given, so API
//   writes to an unlocked entry leave it unlocked
// - live metadata vs staged content (src/emdash-runtime.ts
//   DRAFT_ONLY_UPDATE_KEYS = { data, slug, locale, skipRevision, references,
//   actor, migrateBlocks, replaceBlocks }): `taxonomies`, `seo`, `bylines`,
//   `authorId`, `publishedAt` are LIVE metadata — "Public HTML comes from
//   live columns / SEO / taxonomies, not draft revisions" — written straight
//   to the current row (assignTaxonomies / seo / byline junction writes in
//   src/api/handlers/content.ts handleContentUpdate), creating NO content
//   revision and never publishing a pending draft. Entry terms read through
//   GET /_emdash/api/content/{collection}/{id}/terms/{taxonomy} → `data
//   { terms: [{ id, name, slug, label, … }] }`; `item.seo` and the hydrated
//   `item.bylines` (source "explicit") / `item.byline` carry the current
//   SEO/byline attribution on the ordinary read
// - synthetic classification/byline fixtures: POST
//   /_emdash/api/taxonomies/{name}/terms (taxonomies:manage) `{ slug, label }`
//   with DELETE …/terms/{slug} (404 = already absent) — the accepted T013
//   pattern; bylines are native entities: POST /_emdash/api/admin/bylines
//   (bylines:manage) `{ slug, displayName }` → `data` = the created byline
//   (`{ id, slug, displayName, … }`), DELETE /_emdash/api/admin/bylines/{id}
//   → `{ deleted: true }` / 404 — both created and removed by the
//   development Administrator as owned synthetic fixtures
// - media asset metadata (src/api/schemas/media.ts mediaUpdateBody; PUT
//   /_emdash/api/media/{id}): `alt`/`caption`/dimensions/focal point are
//   CURRENT-STATE asset metadata; a content revision's file value carries
//   the media `id` only — no byte or metadata snapshot is retained by the
//   revision, and no availability/retention guarantee exists (D-REF stays
//   deferred; FR-022/FR-026 boundaries)
//
// Boundaries and non-claims (tasks.md T020; Constitution v3.0.0 II–V):
// - test authoring and static/discovery verification only. Every scenario
//   below is AUTHORED for the T022 serial runtime join; nothing here is
//   executed at authoring time and no runtime PASS, revision outcome, lock
//   observation or recovery result is claimed. Playwright `--list` performs
//   no native calls (hooks run only at execution), so discovery loads no
//   credentials and touches no app
// - NO shared-helper change is made: every T020-specific request shape
//   (skipRevision autosave body, seo/byline writes, lock GET/POST/DELETE,
//   revisions listing/restore, compare, terms read, byline and media-asset
//   writes) goes through the unchanged cmsRequest core, so the accepted
//   T002 helper surface and its consumers are untouched (zero regression
//   surface; the regression analysis is "no shared file changed")
// - the preparation/administration actor is the pre-existing development
//   credential's Administrator fixture (dev@emdash.local, role 50), loaded
//   from its controller-format mode-0600 JSON through the accepted T013
//   adaptation (loadDevAccessToken + createPatActor — never the dev-bypass
//   bootstrap) and pinned to the RUNNER-CONFIGURED origin. It is NEVER
//   presented as coverage of another role (assertDistinctActors refuses
//   that shortcut)
// - lock/conflict coverage requiring a second writer uses the SAME distinct
//   test-owned role-fixture prerequisite as T019
//   (SONGHEALTH_ROLE_FIXTURE_ACCESS, a mode-0600 controller-format JSON
//   credential of a second PAT-owning native account — never
//   dev@emdash.local). Without it those cases SKIP truthfully with the
//   prerequisite named; with it set but unreadable the suite FAILS loudly.
//   The role phase runs through withNativeRole (the supported two-account
//   users-API operation with verified restoration on every exit path); the
//   fixture account is test-owned and the shared dev Administrator and any
//   real/shared user is never mutated
// - overrideLock is exercised ONLY as the pinned, schema-documented native
//   write-anyway control on a test-owned entry after a refused write, with
//   the source cited above — no unexplained lock bypass exists in this file
//   and no lock of another actor's entry is taken over without the
//   documented `takeover`/`overrideLock` semantics being the object under
//   test
// - restore coverage asserts CURRENT native state (read-back data, new
//   audit revision in the listing, bumped version). It deliberately claims
//   nothing about historical preservation: native revision history is
//   finitely pruned (50) and restore itself rewrites current state, so it
//   is NOT an immutable audit archive or historical evidence guarantee
//   (spec.md US6.2/FR-022 staging limits; D-ITA stays deferred)
// - taxonomy/SEO/byline/media cases assert CURRENT state only: these
//   side writes are immediately live, create no content revision, and do
//   not publish a pending draft — the exact anti-atomic-staging evidence.
//   No historical snapshot, media byte archive, cross-record lock or
//   atomic staging system is claimed or built
// - public anonymous reads of draft/pending data are T021's boundary; here
//   the authorized surfaces (GET hydration, compare) and one unauthenticated
//   control on the revision endpoints carry the evidence
// - fixtures are clearly-marked synthetic public-publishable data; entry
//   IDs, `_rev` values, revision ids, media ids, term and byline ids come
//   from native responses only. Failure-safe owned-fixture cleanup runs per
//   test (afterEach) plus an afterAll safety net for BOTH actors' registries
//   and the synthetic term/byline registrations. No D-ITA/D-REF guarantee is
//   claimed anywhere

import { expect, test } from "@playwright/test";

import {
	assertDistinctActors,
	assertSameNativeApp,
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	currentRev,
	DEFAULT_DEVELOPMENT_ORIGIN,
	getMe,
	loadDevAccessToken,
	nativeDataOf,
	nativeErrorOf,
	nativeItemOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	publishEntry,
	readEntry,
	updateEntry,
	uploadSyntheticMedia,
	withNativeRole,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
	type NativeResult,
} from "./cms.helpers";

// ---------------------------------------------------------------------------
// Collections, prerequisite configuration
// ---------------------------------------------------------------------------

/**
 * The `pages` collection carries only a required semantic title at save and
 * the optional `documents` reference binding (T008/T013 definition, live at
 * this baseline per the T018 evidence) — the minimal kind for the
 * concurrency/history/autosave/lock and live-vs-pending fixtures: any
 * refusal can only be about permission, state, time or concurrency, never
 * completeness.
 */
const PAGES_COLLECTION = "pages";

/**
 * The `news` collection for the live-metadata cases: `topic` is attached to
 * news at this baseline (T018 §3/§5), so a synthetic topic term can be
 * assigned to a news entry through the native taxonomy write path.
 */
const NEWS_COLLECTION = "news";

/**
 * The `documents` collection for the shared-file fixtures: its required
 * native `file` field carries a media `id`, which is exactly the shared
 * media identity the boundary cases observe.
 */
const DOCUMENTS_COLLECTION = "documents";

/** The shared `topic` taxonomy (attached to news; T004/T013/T018 standing). */
const TOPIC_TAXONOMY = "topic";

/**
 * Environment variable naming the distinct role-fixture credential: the path
 * to a mode-0600 controller-format JSON file (`{ token }`) whose PAT belongs
 * to a SECOND native account (never dev@emdash.local). The explicit
 * test-owned prerequisite for the second-writer lock cases (quickstart
 * Prerequisites; T001 §6 records the input pending at this baseline).
 */
const ROLE_FIXTURE_CREDENTIAL_ENV = "SONGHEALTH_ROLE_FIXTURE_ACCESS";

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and small shared local helpers
// ---------------------------------------------------------------------------

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
}

/**
 * Readiness for an exercised collection, decided once per worker in
 * beforeAll from the live native schema read: `missing` (collection not
 * initialized — the owning definition task outstanding) SKIPS explicitly;
 * `misconfigured` FAILS loudly so an unexpected schema mismatch stays
 * visible (the accepted T014 gating pattern).
 */
type CollectionReadiness =
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The development-credential Administrator fixture (preparation + admin side). */
let admin: CmsActor;

/**
 * The distinct test-owned role-fixture actor, or undefined while the
 * SONGHEALTH_ROLE_FIXTURE_ACCESS prerequisite is not provided (the
 * second-writer lock cases then skip truthfully). Set by beforeAll only.
 */
let roleFixture: CmsActor | undefined;

/** The fixture account's original native role, captured at first verify. */
let roleFixtureOriginalRole: number | undefined;

/** Readiness of the exercised collections; set by beforeAll. */
let pagesReadiness: CollectionReadiness = { outcome: "missing" };
let newsReadiness: CollectionReadiness = { outcome: "missing" };
let documentsReadiness: CollectionReadiness = { outcome: "missing" };

/** Registration for the synthetic topic term (retained until proven deleted). */
let syntheticTerm: { taxonomy: string; slug: string } | undefined;

/** Registration for the synthetic byline (retained until proven deleted). */
let syntheticByline: { id: string; slug: string } | undefined;

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * The runner-configured origin, mirroring playwright.config.ts exactly (the
 * same discipline as the accepted T003/T007/T014/T019 checks):
 * PLAYWRIGHT_BASE_URL when set, otherwise the documented development origin.
 * node:process is loaded through a dynamic non-literal import because the
 * pinned dependency baseline ships no @types/node.
 */
async function configuredDevelopmentOrigin(): Promise<string> {
	const specifier = "node:process";
	const nodeProcess = (await import(specifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	return nodeProcess.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

/** Truthful schema gate for one exercised collection (T014 gateCollection shape). */
function gateCollection(
	readiness: CollectionReadiness,
	slug: string,
	what: string,
): void {
	test.skip(
		readiness.outcome === "missing",
		`the ${slug} collection is not initialized in the active native schema (owning definition task outstanding; this run cannot exercise ${what})`,
	);
	if (readiness.outcome === "misconfigured") {
		throw new Error(
			`the active native ${slug} collection does not match the approved definition this file relies on: ${readiness.detail}`,
		);
	}
}

function gatePages(): void {
	gateCollection(pagesReadiness, PAGES_COLLECTION, "the revision/concurrency fixtures");
}

function gateNews(): void {
	gateCollection(newsReadiness, NEWS_COLLECTION, "the live-metadata fixtures");
}

function gateDocuments(): void {
	gateCollection(
		documentsReadiness,
		DOCUMENTS_COLLECTION,
		"the shared-media identity fixtures",
	);
}

/**
 * Truthful prerequisite gate for the distinct role-fixture account: when the
 * credential is not provided the second-writer lock cases SKIP with the
 * prerequisite named — two-writer lock evidence is never claimed from one
 * account talking to itself and never silently skipped as if covered.
 */
function gateRoleFixture(): CmsActor {
	test.skip(
		roleFixture === undefined,
		`distinct role-fixture prerequisite missing: set ${ROLE_FIXTURE_CREDENTIAL_ENV} to the mode-0600 controller-format JSON credential of a second PAT-owning native account (T001 §6 records this input pending at this baseline)`,
	);
	return roleFixture!;
}

/** The entry's lifecycle status as the native read returns it, when present. */
function statusOfItem(item: Record<string, unknown> | undefined): string | undefined {
	return typeof item?.status === "string" ? item.status : undefined;
}

/** The entry's field-data object as the native read returns it, when present. */
function dataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.data !== null && typeof item?.data === "object"
		? (item.data as Record<string, unknown>)
		: {};
}

/** The entry's `liveData` object (published values under a pending draft). */
function liveDataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return item?.liveData !== null && typeof item?.liveData === "object"
		? (item.liveData as Record<string, unknown>)
		: {};
}

/** One revision record from a listing item. */
interface RevisionRecord {
	id?: unknown;
	authorId?: unknown;
	createdAt?: unknown;
	data?: unknown;
}

function revisionsOf(result: NativeResult): { items: RevisionRecord[]; total?: unknown } {
	const data = nativeDataOf(result);
	const items = Array.isArray(data?.items) ? (data.items as RevisionRecord[]) : [];
	const total = data?.total;
	return { items, total: typeof total === "number" ? total : undefined };
}

/** The field-data snapshot a revision record carries. */
function recordData(record: RevisionRecord): Record<string, unknown> {
	return record.data !== null && typeof record.data === "object"
		? (record.data as Record<string, unknown>)
		: {};
}

/** Secret-free rendering of an arbitrary caught failure for reports. */
function renderFailure(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

// ---------------------------------------------------------------------------
// T020-specific native request shapes (through the unchanged cmsRequest core)
// ---------------------------------------------------------------------------

/**
 * PUT /_emdash/api/content/{collection}/{id} with an explicit native body —
 * the T020 shapes the shared helper does not wrap (skipRevision autosave,
 * seo, bylines) plus the ordinary data/references/taxonomies writes. The
 * `_rev` precondition is ALWAYS supplied (a fresh currentRev read when the
 * caller does not pin one), so the concurrency contract under test is never
 * silently downgraded to the native blind-write path.
 */
async function contentPut(
	actor: CmsActor,
	collection: string,
	id: string,
	body: {
		data?: Record<string, unknown>;
		references?: Record<string, string[]>;
		taxonomies?: Record<string, string[]>;
		seo?: Record<string, unknown>;
		bylines?: Array<{ bylineId: string; roleLabel?: string | null }>;
		skipRevision?: boolean;
		overrideLock?: boolean;
	},
	rev?: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			body: {
				_rev: rev ?? (await currentRev(actor, collection, id)),
				...(body.data !== undefined ? { data: body.data } : {}),
				...(body.references !== undefined ? { references: body.references } : {}),
				...(body.taxonomies !== undefined ? { taxonomies: body.taxonomies } : {}),
				...(body.seo !== undefined ? { seo: body.seo } : {}),
				...(body.bylines !== undefined ? { bylines: body.bylines } : {}),
				...(body.skipRevision !== undefined ? { skipRevision: body.skipRevision } : {}),
				...(body.overrideLock !== undefined ? { overrideLock: body.overrideLock } : {}),
			},
		},
	);
}

/** GET …/revisions — the native revision-history listing (content:read_drafts). */
async function listRevisions(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/revisions`,
	);
}

/** POST /_emdash/api/revisions/{revisionId}/restore — the selected native restore. */
async function restoreRevision(
	actor: CmsActor,
	revisionId: string,
): Promise<NativeResult> {
	return cmsRequest(actor, `/_emdash/api/revisions/${encodeURIComponent(revisionId)}/restore`, {
		method: "POST",
		body: {},
	});
}

/** GET …/compare — live versus draft revisions (content:read_drafts). */
async function compareEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/compare`,
	);
}

/** GET …/lock — read the current entry-lock holder (edit permission gated). */
async function readEntryLock(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/lock`,
	);
}

/** POST …/lock — take/refresh the caller's lease (optional takeover/token body). */
async function acquireEntryLock(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/lock`,
		{ method: "POST", body: {} },
	);
}

/** DELETE …/lock — release the caller's lease. */
async function releaseEntryLock(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/lock`,
		{ method: "DELETE" },
	);
}

/** GET …/terms/{taxonomy} — the entry's current term assignments. */
async function readEntryTerms(
	actor: CmsActor,
	collection: string,
	id: string,
	taxonomy: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/terms/${encodeURIComponent(taxonomy)}`,
	);
}

// ---------------------------------------------------------------------------
// Synthetic classification/byline/media-asset fixtures (owned, cleaned)
// ---------------------------------------------------------------------------

/**
 * Ensure one clearly-synthetic topic term exists (the accepted T013
 * discipline) and register it for teardown deletion. Identity comes from the
 * native response path (the term is read back by slug before use).
 */
async function ensureSyntheticTopicTerm(): Promise<string> {
	if (syntheticTerm !== undefined) {
		return syntheticTerm.slug;
	}
	const slug = `${SYNTHETIC_FIXTURE_MARK}-topic-${crypto.randomUUID().slice(0, 8)}`;
	const created = await cmsRequest(
		admin,
		`/_emdash/api/taxonomies/${encodeURIComponent(TOPIC_TAXONOMY)}/terms`,
		{ method: "POST", body: { slug, label: `${SYNTHETIC_FIXTURE_MARK} topic term` } },
	);
	if (!created.ok) {
		throw new Error(
			`creating the synthetic topic term must succeed when ${TOPIC_TAXONOMY} is attached (${nativeRefusalOf(created)})`,
		);
	}
	syntheticTerm = { taxonomy: TOPIC_TAXONOMY, slug };
	return slug;
}

/**
 * Delete the registered synthetic term, reconciling uncertain outcomes
 * through a native presence read before any absence claim (the accepted T013
 * retain-until-resolved contract; 404 on DELETE = already absent). Never
 * throws past a failed step without reporting it.
 */
async function deleteSyntheticTerm(): Promise<void> {
	const term = syntheticTerm;
	if (term === undefined) return;
	const termPath = `/_emdash/api/taxonomies/${term.taxonomy}/terms/${encodeURIComponent(term.slug)}`;
	let removal: NativeResult | undefined;
	try {
		removal = await cmsRequest(admin, termPath, { method: "DELETE" });
	} catch (cause) {
		throw new Error(`synthetic term deletion transport failure: ${renderFailure(cause)}`);
	}
	if (removal.ok || removal.status === 404) {
		syntheticTerm = undefined;
		return;
	}
	// Definite refusal: reconcile through a native read before any claim.
	const probe = await cmsRequest(admin, termPath);
	if (probe.status === 404) {
		syntheticTerm = undefined;
		return;
	}
	throw new Error(
		`the owned synthetic ${term.taxonomy} term '${term.slug}' could not be proven deleted (${nativeRefusalOf(removal)}; follow-up read ${probe.status})`,
	);
}

/**
 * Ensure one clearly-synthetic native byline entity exists (bylines:manage;
 * POST /_emdash/api/admin/bylines) and register it for teardown deletion.
 * The byline is an attribution fixture, not a person.
 */
async function ensureSyntheticByline(): Promise<string> {
	if (syntheticByline !== undefined) {
		return syntheticByline.id;
	}
	const slug = `${SYNTHETIC_FIXTURE_MARK}-byline-${crypto.randomUUID().slice(0, 8)}`;
	const created = await cmsRequest(admin, "/_emdash/api/admin/bylines", {
		method: "POST",
		body: { slug, displayName: `${SYNTHETIC_FIXTURE_MARK} byline` },
	});
	if (!created.ok) {
		throw new Error(
			`creating the synthetic byline must succeed (${nativeRefusalOf(created)})`,
		);
	}
	// The pinned create handler returns the byline object directly in `data`.
	const data = nativeDataOf(created);
	const id =
		typeof data?.id === "string" ? data.id : typeof nativeItemOf(created)?.id === "string"
			? (nativeItemOf(created)!.id as string)
			: undefined;
	if (id === undefined) {
		throw new Error("the byline create response carried no usable id");
	}
	syntheticByline = { id, slug };
	return id;
}

/**
 * Delete the registered synthetic byline (DELETE /_emdash/api/admin/bylines/
 * {id}; 404 = already absent), reconciling an uncertain outcome through a
 * native read before any absence claim.
 */
async function deleteSyntheticByline(): Promise<void> {
	const byline = syntheticByline;
	if (byline === undefined) return;
	const bylinePath = `/_emdash/api/admin/bylines/${encodeURIComponent(byline.id)}`;
	let removal: NativeResult | undefined;
	try {
		removal = await cmsRequest(admin, bylinePath, { method: "DELETE" });
	} catch (cause) {
		throw new Error(`synthetic byline deletion transport failure: ${renderFailure(cause)}`);
	}
	if (removal.ok || removal.status === 404) {
		syntheticByline = undefined;
		return;
	}
	const probe = await cmsRequest(admin, bylinePath);
	if (probe.status === 404) {
		syntheticByline = undefined;
		return;
	}
	throw new Error(
		`the owned synthetic byline '${byline.slug}' could not be proven deleted (${nativeRefusalOf(removal)}; follow-up read ${probe.status})`,
	);
}

// ---------------------------------------------------------------------------
// Shared refusal-family assertions (the accepted family contracts)
// ---------------------------------------------------------------------------

/**
 * A native optimistic-concurrency refusal: HTTP 409 with the CONFLICT code,
 * and explicitly NOT success and NOT a validation (400) or permission
 * (401/403) outcome — a concurrency refusal can never masquerade as
 * validation or authorization, and vice versa.
 */
function expectConflictRefusal(result: NativeResult, caseLabel: string): void {
	expect(
		result.ok,
		`${caseLabel}: the native operation must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: a stale _rev precondition is refused with 409`,
	).toBe(409);
	expect(
		result.status === 400 || result.status === 401 || result.status === 403,
		`${caseLabel}: a concurrency refusal must stay distinguishable from validation (400) and authorization (401/403) failures`,
	).toBe(false);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native CONFLICT code`,
	).toBe("CONFLICT");
}

/**
 * A native edit-lock refusal: HTTP 409 with the ENTRY_LOCKED code and holder
 * details — distinct from a revision CONFLICT (a different concurrency
 * family on the same status) and from validation/permission refusals. The
 * holder identity in `details` is what makes the refusal explainable rather
 * than a silent block.
 */
function expectEntryLockedRefusal(
	result: NativeResult,
	caseLabel: string,
	expectedHolderUserId: string,
): void {
	expect(
		result.ok,
		`${caseLabel}: the write must be refused, not reported as success`,
	).toBe(false);
	expect(
		result.status,
		`${caseLabel}: a write against another editor's held entry lock is refused with 409`,
	).toBe(409);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native ENTRY_LOCKED code (distinct from a revision CONFLICT)`,
	).toBe("ENTRY_LOCKED");
	const details = nativeErrorOf(result)?.details as Record<string, unknown> | undefined;
	expect(
		typeof details?.userId === "string" && details.userId === expectedHolderUserId,
		`${caseLabel}: the refusal must name the holding account in its details`,
	).toBe(true);
}

// ---------------------------------------------------------------------------
// Worker setup: development access, role-fixture prerequisite, schema reads
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	const origin = await configuredDevelopmentOrigin();
	// Development native access through the pre-existing development
	// credential (T013 test-authentication adaptation). This hook
	// deliberately creates no owned fixtures; Playwright --list discovery
	// performs no native calls at all (hooks run only at execution).
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// The distinct role-fixture prerequisite: a CONFIGURED credential that
	// fails to load/verify is a loud failure; an ABSENT one leaves the
	// second-writer lock cases to their truthful skip.
	const processSpecifier = "node:process";
	const nodeProcess = (await import(processSpecifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	const fixtureCredentialPath = nodeProcess.env[ROLE_FIXTURE_CREDENTIAL_ENV];
	if (fixtureCredentialPath !== undefined && fixtureCredentialPath.trim().length > 0) {
		const fixture = await createPatActor({
			baseUrl: origin,
			token: await loadDevAccessToken(fixtureCredentialPath.trim()),
		});
		assertDistinctActors(admin, fixture);
		assertSameNativeApp(admin, fixture);
		expect(
			fixture.email,
			"the role-fixture credential must belong to a genuinely distinct native account (never dev@emdash.local)",
		).not.toBe("dev@emdash.local");
		roleFixture = fixture;
		roleFixtureOriginalRole = fixture.role;
	}

	// One live schema read per exercised collection decides readiness. The
	// only unconditional definition facts the checks below rely on: a
	// required semantic title everywhere (so refusals can never be about
	// completeness) and the required native `file` field on documents (the
	// shared media identity under observation).
	const readinessOf = async (collection: string): Promise<CollectionReadiness> => {
		const schemaRead = await cmsRequest(
			admin,
			`/_emdash/api/schema/collections/${encodeURIComponent(collection)}`,
			{ searchParams: { includeFields: "true" } },
		);
		if (schemaRead.status === 404) {
			return { outcome: "missing" };
		}
		expect(
			schemaRead.ok,
			`reading the native ${collection} collection schema must succeed when it is not a 404 (got ${schemaRead.status})`,
		).toBe(true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(Array.isArray(fields), `the ${collection} schema read must include fields`).toBe(
			true,
		);
		const bySlug = new Map<string, SchemaField>();
		for (const field of fields as SchemaField[]) {
			if (typeof field.slug === "string") bySlug.set(field.slug, field);
		}
		const title = bySlug.get("title");
		const problems: string[] = [];
		if (title?.type !== "string" || title.required !== true) {
			problems.push("title must be a required native string field");
		}
		if (collection === DOCUMENTS_COLLECTION) {
			const file = bySlug.get("file");
			if (file?.required !== true) {
				problems.push("documents.file must be a required native field");
			}
		}
		return problems.length > 0
			? { outcome: "misconfigured", detail: problems.join("; ") }
			: { outcome: "ready" };
	};
	pagesReadiness = await readinessOf(PAGES_COLLECTION);
	newsReadiness = await readinessOf(NEWS_COLLECTION);
	documentsReadiness = await readinessOf(DOCUMENTS_COLLECTION);
});

// ---------------------------------------------------------------------------
// Failure-safe owned-fixture cleanup and registrations
// ---------------------------------------------------------------------------

test.afterEach(async () => {
	// Partial-setup guard: beforeAll creates no owned fixtures, so actors
	// that never finished bootstrapping have nothing to reconcile. Each
	// cleanup runs INDEPENDENTLY; combined failures are reported only after
	// all attempts.
	const failures: string[] = [];
	if (roleFixture !== undefined) {
		// The fixture account's registry defines WHAT may be touched; the
		// development Administrator (assertSameNativeApp-enforced inside the
		// helper) supplies the deletion authority.
		try {
			const report = await cleanupOwnedFixtures(roleFixture, {
				adminActor: admin,
				permanent: true,
			});
			console.log(
				`[cms-revisions] role-fixture owned-fixture cleanup after test: ${
					report.complete ? "complete" : "UNRESOLVED"
				} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
			);
			expect(
				report.complete,
				"every owned synthetic fixture created by the role fixture must be proven resolved",
			).toBe(true);
		} catch (cause) {
			failures.push(`role-fixture cleanup: ${renderFailure(cause)}`);
		}
	}
	if (admin !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			console.log(
				`[cms-revisions] admin owned-fixture cleanup after test: ${
					report.complete ? "complete" : "UNRESOLVED"
				} (entries attempted ${report.entries.length}, media attempted ${report.media.length})`,
			);
			expect(
				report.complete,
				"every owned synthetic fixture created by this test must be proven resolved (unresolved cleanup is a reported failure, not a silent leftover)",
			).toBe(true);
		} catch (cause) {
			failures.push(`admin cleanup: ${renderFailure(cause)}`);
		}
	}
	try {
		await deleteSyntheticTerm();
	} catch (cause) {
		failures.push(`synthetic term cleanup: ${renderFailure(cause)}`);
	}
	try {
		await deleteSyntheticByline();
	} catch (cause) {
		failures.push(`synthetic byline cleanup: ${renderFailure(cause)}`);
	}
	if (failures.length > 0) {
		throw new Error(`afterTest cleanup failures after all attempts: ${failures.join("; ")}`);
	}
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything). Every
	// attempt runs INDEPENDENTLY; the combined failures are reported only
	// after ALL attempts.
	const failures: string[] = [];
	if (roleFixture !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(roleFixture, {
				adminActor: admin,
				permanent: true,
			});
			expect(
				report.complete,
				"the final role-fixture cleanup must leave zero unresolved owned fixtures",
			).toBe(true);
		} catch (cause) {
			failures.push(`role-fixture cleanup: ${renderFailure(cause)}`);
		}
	}
	if (admin !== undefined) {
		try {
			const report = await cleanupOwnedFixtures(admin, { permanent: true });
			expect(
				report.complete,
				"the final admin cleanup must leave zero unresolved owned fixtures",
			).toBe(true);
		} catch (cause) {
			failures.push(`admin cleanup: ${renderFailure(cause)}`);
		}
	}
	try {
		await deleteSyntheticTerm();
	} catch (cause) {
		failures.push(`synthetic term cleanup: ${renderFailure(cause)}`);
	}
	try {
		await deleteSyntheticByline();
	} catch (cause) {
		failures.push(`synthetic byline cleanup: ${renderFailure(cause)}`);
	}
	// Verification-only safety net for the fixture account: withNativeRole
	// restores and verifies the role itself on every exit path, so this only
	// RE-READS the live identity — no mutation, no disable/enable phase
	// exists in this suite.
	if (roleFixture !== undefined && roleFixtureOriginalRole !== undefined) {
		try {
			const live = nativeDataOf(await getMe(roleFixture));
			expect(
				live?.role,
				"the fixture account's live credential must still act at its captured original role after all role phases",
			).toBe(roleFixtureOriginalRole);
		} catch (cause) {
			failures.push(`fixture-account role verification: ${renderFailure(cause)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`afterAll reconciliation failures after all attempts: ${failures.join("; ")}`);
	}
});

// ---------------------------------------------------------------------------
// Schema precondition
// ---------------------------------------------------------------------------

test("schema precondition: the approved native pages, news and documents definitions are active", () => {
	gatePages();
	gateNews();
	gateDocuments();
	// Reaching here with each collection ready is the asserted precondition
	// itself (required semantic title everywhere; required native file on
	// documents).
	expect(pagesReadiness.outcome).toBe("ready");
	expect(newsReadiness.outcome).toBe("ready");
	expect(documentsReadiness.outcome).toBe("ready");
});

// ---------------------------------------------------------------------------
// A. Optimistic concurrency — update matrix (US6.5/US6.6, FR-024/FR-026)
// ---------------------------------------------------------------------------

test("current _rev: a fresh token carries an update; a stale token is refused without touching newer work, and the re-read retry succeeds", async () => {
	gatePages();

	// A current token carries the update it was minted from.
	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("concurrency-base") },
	});
	expect(entry.result.ok, "the concurrency fixture must save").toBe(true);
	const baseRev = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);
	const carried = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: uniqueTitle("concurrency-carried") },
		rev: baseRev,
	});
	expect(
		carried.ok,
		"an update carrying the CURRENT _rev must succeed (the precondition is satisfied)",
	).toBe(true);

	// The same token is now stale: the carried write bumped the entry's
	// version, so a second update with it is a native conflict.
	expectConflictRefusal(
		await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
			data: { title: uniqueTitle("concurrency-stale") },
			rev: baseRev,
		}),
		"updating with the stale _rev after a newer write",
	);

	// Refusal read-back: the refused write changed nothing — the carried
	// title is still the current pending draft data.
	const afterRefusal = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		dataOfItem(afterRefusal).title,
		"the refused stale write must not change the stored data",
	).toBe(dataOfItem(nativeItemOf(carried)).title);

	// Concurrent-saves control: two writers both hold the same post-carried
	// view. The first write wins; the second is refused and the NEWER saved
	// data survives — a stale/conflicting save never silently overwrites.
	const sharedRev = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);
	const newerTitle = uniqueTitle("concurrency-newer-writer");
	const olderAttemptTitle = uniqueTitle("concurrency-slower-writer");
	const newerWrite = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: newerTitle },
		rev: sharedRev,
	});
	expect(newerWrite.ok, "the first writer's save with the shared current _rev must succeed").toBe(
		true,
	);
	expectConflictRefusal(
		await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
			data: { title: olderAttemptTitle },
			rev: sharedRev,
		}),
		"the second writer's save with the now-stale shared _rev",
	);
	const afterConcurrent = dataOfItem(
		nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!)),
	);
	expect(
		afterConcurrent.title,
		"the newer writer's data must survive the refused conflicting save (no silent overwrite)",
	).toBe(newerTitle);

	// The re-read discipline (US6.6): after the uncertain/refused outcome,
	// reconcile from CURRENT state — refresh the precondition, then retry.
	const retried = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: uniqueTitle("concurrency-retried") },
	});
	expect(
		retried.ok,
		"re-reading the current state and retrying with a fresh _rev must succeed",
	).toBe(true);
	expect(
		dataOfItem(nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!))).title,
		"the retried write must be the current pending draft data",
	).toBe(dataOfItem(nativeItemOf(retried)).title);
});

// ---------------------------------------------------------------------------
// A. Optimistic concurrency — publish precondition (US6.5/US6.6)
// ---------------------------------------------------------------------------

test("stale _rev publish: refused as a native conflict with publication state unchanged, then the re-read retry publishes", async () => {
	gatePages();

	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("publish-precondition") },
	});
	expect(entry.result.ok, "the publish-precondition fixture must save").toBe(true);
	const staleRev = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);

	// A newer write invalidates the captured token before the publish.
	const newer = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: uniqueTitle("publish-precondition-bumped") },
	});
	expect(newer.ok, "the newer write that invalidates the token must succeed").toBe(true);

	expectConflictRefusal(
		await publishEntry(admin, PAGES_COLLECTION, entry.entryId!, { rev: staleRev }),
		"publishing with a stale _rev",
	);

	// Refusal read-back: still a draft, never published by the refused call.
	const refusedState = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(refusedState), "the refused publish must leave the entry a draft").toBe(
		"draft",
	);
	expect(refusedState?.publishedAt, "the refused publish must record no publication time").toBeNull();

	// Re-read current state, then the retry publishes (the deeper matrix
	// slice beyond the accepted T019 control: refusal read-back plus the
	// verified promoted read-back).
	const retried = await publishEntry(admin, PAGES_COLLECTION, entry.entryId!);
	expect(retried.ok, "the re-read retry with a fresh _rev must publish").toBe(true);
	const published = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(published), "the retried publish must show the published state").toBe(
		"published",
	);
	expect(
		dataOfItem(published).title,
		"publication promotes the pending draft data (the bumped write) to the live columns",
	).toBe(dataOfItem(nativeItemOf(newer)).title);

	// The publication itself bumped the row, so the pre-publish token is
	// now stale for a further publish too — one more truthfully refused.
	expectConflictRefusal(
		await publishEntry(admin, PAGES_COLLECTION, entry.entryId!, { rev: staleRev }),
		"publishing again with the pre-publication _rev",
	);
});

// ---------------------------------------------------------------------------
// B. Native revision history and selected restore (US6.5, FR-024/FR-030)
// ---------------------------------------------------------------------------

test("revision history: saves create distinct native revisions newest-first with caller authorship, and a selected native restore reverts the content through a new revision", async () => {
	gatePages();

	// CREATE stages no revision (pinned ContentRepository.create writes
	// columns only) — the listing starts empty and grows per save.
	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("history-create") },
	});
	expect(entry.result.ok, "the history fixture must save").toBe(true);
	const initialListing = revisionsOf(
		await listRevisions(admin, PAGES_COLLECTION, entry.entryId!),
	);
	expect(initialListing.total, "a freshly created entry has no revisions yet").toBe(0);
	expect(initialListing.items.length, "the fresh listing must be empty").toBe(0);

	// Two ordinary saves → two distinct revisions, newest first, authored by
	// the calling account (native revision attribution).
	const firstTitle = uniqueTitle("history-first");
	const secondTitle = uniqueTitle("history-second");
	await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, { data: { title: firstTitle } });
	await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, { data: { title: secondTitle } });
	const listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(listing.total, "each ordinary save keeps a revision").toBe(2);
	expect(listing.items.length, "the listing returns the saved revisions").toBe(2);
	expect(
		typeof listing.items[0]?.id === "string" && typeof listing.items[1]?.id === "string",
		"every listed revision must carry its id (the native version identity)",
	).toBe(true);
	expect(
		listing.items[0]?.id !== listing.items[1]?.id,
		"the two saves must produce two DISTINCT revision identities",
	).toBe(true);
	expect(
		recordData(listing.items[0]).title,
		"the listing is newest-first (the second save heads it)",
	).toBe(secondTitle);
	expect(
		recordData(listing.items[1]).title,
		"the older revision follows with the first save's data",
	).toBe(firstTitle);
	expect(
		listing.items[0]?.authorId,
		"a save-created revision records the calling account as its author",
	).toBe(admin.userId);
	expect(
		typeof listing.items[0]?.createdAt === "string",
		"each revision carries its native creation timestamp",
	).toBe(true);

	// Publish so live columns and a live revision exist and no pending draft
	// remains (publish promotes the pending draft and clears the pointer).
	const published = await publishEntry(admin, PAGES_COLLECTION, entry.entryId!);
	expect(published.ok, "the history fixture must publish before restore").toBe(true);
	const beforeRestore = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(beforeRestore), "the fixture must be published before restore").toBe(
		"published",
	);
	expect(beforeRestore?.draftRevisionId, "publication clears the pending draft pointer").toBeNull();
	expect(
		typeof beforeRestore?.liveRevisionId === "string",
		"publication records the promoted live revision",
	).toBe(true);
	const versionBeforeRestore = typeof beforeRestore?.version === "number" ? beforeRestore.version : undefined;
	expect(versionBeforeRestore, "the entry carries its native version counter").not.toBeUndefined();

	// Selected native restore of the FIRST save's revision.
	const restored = await restoreRevision(admin, String(listing.items[1]?.id));
	expect(
		restored.ok,
		`the native revision restore must succeed (${nativeRefusalOf(restored)})`,
	).toBe(true);

	// Post-restore read-back: with no pending draft the read returns the
	// restored live data directly; the entry stays published; the row's
	// version moved.
	const afterRestore = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(afterRestore), "restore does not change the published lifecycle state").toBe(
		"published",
	);
	expect(
		dataOfItem(afterRestore).title,
		"the restored content must read back as the selected revision's data",
	).toBe(firstTitle);
	expect(afterRestore?.draftRevisionId, "restore leaves no pending draft behind here").toBeNull();
	const versionAfterRestore = typeof afterRestore?.version === "number" ? afterRestore.version : undefined;
	expect(
		typeof versionAfterRestore === "number" &&
			typeof versionBeforeRestore === "number" &&
			versionAfterRestore > versionBeforeRestore,
		"the restore bumps the entry's native version (its own write, not a no-op)",
	).toBe(true);

	// Revision state after restore: a NEW revision carrying the restored
	// snapshot (authored by the restoring caller) heads the listing, and the
	// prior revisions remain listed in the CURRENT native state. This is a
	// current-state observation only: native history is finitely pruned
	// (newest 50 per entry) and restore itself rewrites current state, so
	// NOTHING here is an immutable-audit-archive or historical-preservation
	// claim (spec.md US6.2 staging limits; D-ITA deferred).
	const listingAfterRestore = revisionsOf(
		await listRevisions(admin, PAGES_COLLECTION, entry.entryId!),
	);
	expect(
		listingAfterRestore.total,
		"the restore appends its audit revision to the history",
	).toBe(3);
	expect(
		recordData(listingAfterRestore.items[0]).title,
		"the restore-created revision heads the listing with the restored snapshot",
	).toBe(firstTitle);
	expect(
		listingAfterRestore.items[0]?.authorId,
		"the restore revision records the restoring caller as its author",
	).toBe(admin.userId);
	expect(
		recordData(listingAfterRestore.items[1]).title,
		"the pre-restore newest revision is still listed (current state)",
	).toBe(secondTitle);
});

// ---------------------------------------------------------------------------
// C. Native autosave and interrupted-edit draft recovery (US6.5, FR-024)
// ---------------------------------------------------------------------------

test("native autosave: skipRevision saves replace the superseded autosave revision, and the pending draft survives an interrupted edit server-side", async () => {
	gatePages();

	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("autosave-create") },
	});
	expect(entry.result.ok, "the autosave fixture must save").toBe(true);
	const createTitle = dataOfItem(nativeItemOf(entry.result)).title;

	// First autosave (skipRevision): with no prior draft there is nothing to
	// replace — it stages exactly one pending draft revision.
	const autosaveOneTitle = uniqueTitle("autosave-one");
	const firstAutosave = await contentPut(
		admin,
		PAGES_COLLECTION,
		entry.entryId!,
		{ data: { title: autosaveOneTitle }, skipRevision: true },
	);
	expect(
		firstAutosave.ok,
		`a skipRevision autosave save must succeed (${nativeRefusalOf(firstAutosave)})`,
	).toBe(true);
	let listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(listing.total, "the first autosave stages one pending draft revision").toBe(1);

	// Second autosave: the pinned behavior — the superseded autosave draft
	// revision is REPLACED (deleted), not accumulated.
	const autosaveTwoTitle = uniqueTitle("autosave-two");
	const secondAutosave = await contentPut(
		admin,
		PAGES_COLLECTION,
		entry.entryId!,
		{ data: { title: autosaveTwoTitle }, skipRevision: true },
	);
	expect(secondAutosave.ok, "the second skipRevision autosave save must succeed").toBe(true);
	listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		listing.total,
		"a skipRevision save replaces the previous autosave revision instead of accumulating history",
	).toBe(1);
	expect(
		recordData(listing.items[0]).title,
		"the surviving autosave revision is the newest autosaved content",
	).toBe(autosaveTwoTitle);

	// An ORDINARY save after the autosave keeps its own revision (history
	// resumes) — the replacement semantics belong to skipRevision alone.
	const explicitTitle = uniqueTitle("autosave-explicit-save");
	const explicitSave = await contentPut(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: explicitTitle },
	});
	expect(explicitSave.ok, "the ordinary save after autosaves must succeed").toBe(true);
	listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(listing.total, "an ordinary save after autosaves keeps a new revision").toBe(2);

	// Interrupted-edit draft recovery: there is NO session-resume API in
	// pinned 1.1.0 — the native recovery mechanism IS the persisted pending
	// draft revision. A fresh read (a re-opened editor context; nothing from
	// the writing session is reused) returns the latest saved pending
	// content as the entry's data, with the pre-edit column data exposed as
	// liveData — the interrupted edit is recovered server-side.
	const recovered = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		dataOfItem(recovered).title,
		"a fresh authorized read recovers the pending draft content after the interrupted edit",
	).toBe(explicitTitle);
	expect(
		typeof recovered?.draftRevisionId === "string",
		"the recovered read identifies the pending draft revision",
	).toBe(true);
	expect(
		liveDataOfItem(recovered).title,
		"the recovery read still exposes the pre-edit column data as liveData (the unpublished base)",
	).toBe(createTitle);

	// The compare surface states the same boundary over the revisions
	// themselves: before the first publication there is no live revision, so
	// live is null while the draft holds the recovered content.
	const compared = nativeDataOf(
		await compareEntry(admin, PAGES_COLLECTION, entry.entryId!),
	);
	expect(compared?.hasChanges, "a pending draft with no live revision reports changes").toBe(
		true,
	);
	expect(compared?.live, "an unpublished entry has no live revision to compare").toBeNull();
	expect(
		(compared?.draft as Record<string, unknown> | null)?.title,
		"the compare draft is the recovered pending content",
	).toBe(explicitTitle);
});

// ---------------------------------------------------------------------------
// C/E. Native edit locks with a genuinely distinct second account (US6.5, FR-024)
// ---------------------------------------------------------------------------

test("edit locks: a distinct account's lease blocks a second writer with ENTRY_LOCKED until the documented override or release", async () => {
	const fixture = gateRoleFixture();
	gatePages();

	// An entry owned by the development Administrator; the fixture account
	// (acting at Editor through the supported role operation) is a genuinely
	// distinct second writer.
	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("lock-entry") },
	});
	expect(entry.result.ok, "the lock fixture must save").toBe(true);
	const originalTitle = dataOfItem(nativeItemOf(entry.result)).title;

	await withNativeRole(admin, fixture, NATIVE_ROLES.editor, async (editor: CmsActor) => {
		// The editor opens the entry: takes the lease.
		const acquired = nativeDataOf(await acquireEntryLock(editor, PAGES_COLLECTION, entry.entryId!));
		expect(acquired?.enabled, "edit locking is enabled for the seed collections (native default)").toBe(true);
		expect(
			acquired?.heldByCaller,
			"the acquiring account holds the lease it just took",
		).toBe(true);
		const holder = acquired?.holder as Record<string, unknown> | null | undefined;
		const holderUserId = typeof holder?.userId === "string" ? holder.userId : undefined;
		expect(
			holderUserId === editor.userId,
			"the reported holder is the acquiring (distinct) account",
		).toBe(true);
		const acquiredAt = typeof holder?.acquiredAt === "string" ? holder.acquiredAt : undefined;
		const expiresAt = typeof holder?.expiresAt === "string" ? holder.expiresAt : undefined;
		expect(
			acquiredAt !== undefined && expiresAt !== undefined && expiresAt > acquiredAt,
			"the lease reports its acquisition and future expiry (ISO strings, 7-minute native lease)",
		).toBe(true);

		// A second account's acquire WITHOUT takeover is not an error: it
		// reports the existing holder and heldByCaller false (the soft
		// "held" outcome — the documented way to discover the conflict).
		const secondAcquire = nativeDataOf(
			await acquireEntryLock(admin, PAGES_COLLECTION, entry.entryId!),
		);
		expect(
			secondAcquire?.heldByCaller,
			"the second account does not hold the lease it could not take",
		).toBe(false);
		expect(
			(secondAcquire?.holder as Record<string, unknown> | null | undefined)?.userId,
			"the holder is unchanged by the refused-without-takeover acquire",
		).toBe(editor.userId);
		const readBySecond = nativeDataOf(
			await readEntryLock(admin, PAGES_COLLECTION, entry.entryId!),
		);
		expect(
			(readBySecond?.holder as Record<string, unknown> | null | undefined)?.userId,
			"the lock read by the second account names the holding account",
		).toBe(editor.userId);

		// The second writer's save is refused with the native lock conflict,
		// naming the holder — and the refusal changes nothing.
		const freshRev = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);
		expectEntryLockedRefusal(
			await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
				data: { title: uniqueTitle("lock-blocked-write") },
				rev: freshRev,
			}),
			"the second writer's save against the held entry lock",
			editor.userId,
		);
		expect(
			dataOfItem(nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!))).title,
			"the lock-refused write must not change the stored data",
		).toBe(originalTitle);

		// Reading the item again does not clear the refusal (the lease is
		// the gate, not read staleness) — still refused after a re-read.
		await readEntry(admin, PAGES_COLLECTION, entry.entryId!);
		expectEntryLockedRefusal(
			await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
				data: { title: uniqueTitle("lock-blocked-write-2") },
				rev: freshRev,
			}),
			"the second writer's save after re-reading (the lease still governs)",
			editor.userId,
		);

		// overrideLock is the pinned, schema-documented write-anyway control
		// (contentUpdateBody overrideLockFlag; claimEntryLockForWrite returns
		// null when it is set) — the explained native override, not a bypass
		// invented here. The lock-refused writes consumed nothing, so the
		// SAME precondition token carries the overridden write.
		const overridden = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
			data: { title: uniqueTitle("lock-overridden-write") },
			rev: freshRev,
			overrideLock: true,
		});
		expect(
			overridden.ok,
			`the documented overrideLock write must succeed (${nativeRefusalOf(overridden)})`,
		).toBe(true);
		expect(
			dataOfItem(nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!))).title,
			"the overridden write is the current pending draft data",
		).toBe(dataOfItem(nativeItemOf(overridden)).title);
		// The override writes anyway; it does not steal or drop the lease.
		const afterOverride = nativeDataOf(
			await readEntryLock(admin, PAGES_COLLECTION, entry.entryId!),
		);
		expect(
			(afterOverride?.holder as Record<string, unknown> | null | undefined)?.userId,
			"the overriding write leaves the holder's lease in place",
		).toBe(editor.userId);

		// The holder releases; the second writer can then write again with
		// no override and no refusal.
		const released = nativeDataOf(
			await releaseEntryLock(editor, PAGES_COLLECTION, entry.entryId!),
		);
		expect(released?.released, "the holder's release must report released").toBe(true);
		const afterRelease = nativeDataOf(
			await readEntryLock(admin, PAGES_COLLECTION, entry.entryId!),
		);
		expect(
			afterRelease?.holder,
			"the released entry has no lock holder",
		).toBeNull();
		const unlockedWrite = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
			data: { title: uniqueTitle("lock-post-release-write") },
		});
		expect(
			unlockedWrite.ok,
			`after release the second writer's save must succeed with no override (${nativeRefusalOf(unlockedWrite)})`,
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// D. Published versus pending content-data/reference staging (US6.2, FR-022)
// ---------------------------------------------------------------------------

test("published vs pending: content-data and reference edits stage under the draft revision while the live published data stays intact until Publish Changes", async () => {
	gatePages();
	gateDocuments();

	// A published Document fixture: the selection target for the pending
	// reference staging (one authoritative shared record, no duplicates).
	const media = await uploadSyntheticMedia(admin);
	expect(media.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const document = await createSyntheticEntry(admin, DOCUMENTS_COLLECTION, {
		data: { title: uniqueTitle("pending-document"), file: { id: media.mediaId! } },
	});
	expect(document.result.ok, "the document fixture must save").toBe(true);
	const publishedDocument = await publishEntry(admin, DOCUMENTS_COLLECTION, document.entryId!);
	expect(publishedDocument.ok, "the document fixture must publish").toBe(true);

	// The page fixture: publish the initial content.
	const initialTitle = uniqueTitle("pending-initial");
	const page = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: initialTitle },
	});
	expect(page.result.ok, "the page fixture must save").toBe(true);
	expect(
		(await publishEntry(admin, PAGES_COLLECTION, page.entryId!)).ok,
		"the initial content must publish",
	).toBe(true);
	const afterInitialPublish = nativeItemOf(
		await readEntry(admin, PAGES_COLLECTION, page.entryId!),
	);
	expect(statusOfItem(afterInitialPublish), "the initial publication is live").toBe("published");
	expect(
		afterInitialPublish?.draftRevisionId,
		"a freshly published entry with no edits has no pending draft",
	).toBeNull();

	// Stage the pending edits: changed content data PLUS a reference
	// selection, in one native save.
	const pendingTitle = uniqueTitle("pending-staged");
	const staged = await contentPut(admin, PAGES_COLLECTION, page.entryId!, {
		data: { title: pendingTitle },
		references: { documents: [document.entryId!] },
	});
	expect(
		staged.ok,
		`staging content-data and reference edits on published content must succeed (${nativeRefusalOf(staged)})`,
	).toBe(true);

	// Read-back: the entry stays published; the authorized read surfaces the
	// PENDING draft as `data` while `liveData` still carries the published
	// values — the live content-data revision is preserved until an
	// authorized Publish Changes.
	const pending = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(statusOfItem(pending), "staged edits do not change the published lifecycle state").toBe(
		"published",
	);
	expect(
		dataOfItem(pending).title,
		"the authorized read surfaces the pending staged data",
	).toBe(pendingTitle);
	expect(
		liveDataOfItem(pending).title,
		"the live published data is preserved untouched under the pending draft",
	).toBe(initialTitle);
	expect(
		typeof pending?.draftRevisionId === "string",
		"the staged edit is identified by its pending draft revision",
	).toBe(true);

	// The compare surface states the same boundary over the revisions: the
	// live revision still carries the published data, the draft carries the
	// staged data AND the staged reference selection (`_references`; the
	// values are native translation-group ids, so the length is asserted).
	const compared = nativeDataOf(await compareEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(compared?.hasChanges, "a staged edit against a live revision reports changes").toBe(true);
	const liveCompare = compared?.live as Record<string, unknown> | null | undefined;
	const draftCompare = compared?.draft as Record<string, unknown> | null | undefined;
	expect(liveCompare?.title, "the compare live side is the published content data").toBe(
		initialTitle,
	);
	expect(draftCompare?.title, "the compare draft side is the staged content data").toBe(
		pendingTitle,
	);
	const stagedReferences = draftCompare?._references as
		| Record<string, unknown[]>
		| undefined;
	expect(
		Array.isArray(stagedReferences?.documents) && stagedReferences.documents.length === 1,
		"the pending draft carries the staged reference selection under the native _references key",
	).toBe(true);

	// Publish Changes: the pending content-data and reference edits become
	// the live published state, the draft pointer clears, and compare shows
	// no further changes (the live selection is the promoted one).
	const publishedChanges = await publishEntry(admin, PAGES_COLLECTION, page.entryId!);
	expect(publishedChanges.ok, "publishing the pending changes must succeed").toBe(true);
	const afterPublishChanges = nativeItemOf(
		await readEntry(admin, PAGES_COLLECTION, page.entryId!),
	);
	expect(statusOfItem(afterPublishChanges), "the entry remains published").toBe("published");
	expect(
		dataOfItem(afterPublishChanges).title,
		"the published read-back carries the formerly pending content data",
	).toBe(pendingTitle);
	expect(
		afterPublishChanges?.draftRevisionId,
		"publishing the changes clears the pending draft pointer",
	).toBeNull();
	const comparedAfter = nativeDataOf(
		await compareEntry(admin, PAGES_COLLECTION, page.entryId!),
	);
	expect(comparedAfter?.hasChanges, "no pending changes remain after publication").toBe(false);
	expect(comparedAfter?.draft, "no draft revision remains after publication").toBeNull();
	const liveAfter = comparedAfter?.live as Record<string, unknown> | null | undefined;
	expect(liveAfter?.title, "the live revision is the promoted content data").toBe(pendingTitle);
	const liveReferences = liveAfter?._references as Record<string, unknown[]> | undefined;
	expect(
		Array.isArray(liveReferences?.documents) && liveReferences.documents.length === 1,
		"the staged reference selection was promoted to the live selection",
	).toBe(true);

	// The shared Document target keeps its identity through the promotion —
	// the same authoritative record, never a duplicate (SC-002 boundary).
	const documentAfter = nativeItemOf(
		await readEntry(admin, DOCUMENTS_COLLECTION, document.entryId!),
	);
	expect(
		documentAfter?.id,
		"the selected Document keeps its authoritative identity after publication",
	).toBe(document.entryId!);
});

// ---------------------------------------------------------------------------
// E. Live metadata boundaries: taxonomy/SEO/byline are current-state only
// ---------------------------------------------------------------------------

test("live metadata: taxonomy, SEO and byline writes apply to current state immediately, create no content revisions, and leave the pending content draft pending", async () => {
	gateNews();

	// Owned synthetic classification/byline fixtures (native entities).
	const termSlug = await ensureSyntheticTopicTerm();
	const bylineId = await ensureSyntheticByline();

	// A published news entry with a PENDING content-data draft: the staged
	// content edit must stay pending across every metadata write below.
	const initialTitle = uniqueTitle("metadata-initial");
	const entry = await createSyntheticEntry(admin, NEWS_COLLECTION, {
		data: { title: initialTitle },
	});
	expect(entry.result.ok, "the metadata fixture must save").toBe(true);
	expect(
		(await publishEntry(admin, NEWS_COLLECTION, entry.entryId!)).ok,
		"the metadata fixture must publish",
	).toBe(true);
	const pendingTitle = uniqueTitle("metadata-pending");
	expect(
		(await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
			data: { title: pendingTitle },
		})).ok,
		"staging the pending content draft must succeed",
	).toBe(true);
	const revisionsBeforeMetadata = revisionsOf(
		await listRevisions(admin, NEWS_COLLECTION, entry.entryId!),
	).total;

	// Three separate current-state metadata writes while the content draft
	// is pending: taxonomy assignment, SEO metadata, byline attribution.
	// None of these is a DRAFT_ONLY key, so none stages a content revision
	// and none publishes the pending draft.
	const termWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		taxonomies: { [TOPIC_TAXONOMY]: [termSlug] },
	});
	expect(termWrite.ok, `the taxonomy assignment write must succeed (${nativeRefusalOf(termWrite)})`).toBe(true);
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} seo title`;
	const seoWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		seo: { title: seoTitle },
	});
	expect(seoWrite.ok, `the SEO metadata write must succeed (${nativeRefusalOf(seoWrite)})`).toBe(true);
	const bylineWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		bylines: [{ bylineId, roleLabel: "Written by" }],
	});
	expect(bylineWrite.ok, `the byline attribution write must succeed (${nativeRefusalOf(bylineWrite)})`).toBe(true);

	// Immediate current-state read-back with NO publication in between.
	const current = nativeItemOf(await readEntry(admin, NEWS_COLLECTION, entry.entryId!));
	// Taxonomy: the entry's current term assignment contains the synthetic term.
	const terms = nativeDataOf(
		await readEntryTerms(admin, NEWS_COLLECTION, entry.entryId!, TOPIC_TAXONOMY),
	)?.terms;
	const termSlugs = Array.isArray(terms)
		? terms.map((term) => (term as Record<string, unknown>)?.slug)
		: [];
	expect(
		termSlugs.includes(termSlug),
		"the taxonomy assignment is current state immediately (no publication needed)",
	).toBe(true);
	// SEO: the current item carries the written SEO metadata.
	const seo = current?.seo as Record<string, unknown> | null | undefined;
	expect(seo?.title, "the SEO metadata is current state immediately").toBe(seoTitle);
	// Byline: the current item carries the explicit byline attribution.
	const bylinesRaw = current?.bylines;
	const bylines = Array.isArray(bylinesRaw)
		? (bylinesRaw as Array<Record<string, unknown>>)
		: [];
	const assignedByline = bylines.find(
		(credit) =>
			(credit.byline as Record<string, unknown> | undefined)?.id === bylineId,
	);
	expect(
		assignedByline !== undefined,
		"the byline attribution is current state immediately (an explicit credit)",
	).toBe(true);

	// And the content draft is STILL pending: the authorized read still
	// surfaces the staged data over the preserved live data, compare still
	// reports changes, and the revision-history size is UNCHANGED by the
	// three metadata writes — taxonomy/SEO/byline are not staged with the
	// content revision and do not publish it (no atomic staging; FR-022).
	expect(
		dataOfItem(current).title,
		"the pending content draft is untouched by the metadata writes",
	).toBe(pendingTitle);
	expect(
		liveDataOfItem(current).title,
		"the live published data is still the pre-edit content under the pending draft",
	).toBe(initialTitle);
	const compared = nativeDataOf(await compareEntry(admin, NEWS_COLLECTION, entry.entryId!));
	expect(compared?.hasChanges, "the content draft is still pending after the metadata writes").toBe(
		true,
	);
	const revisionsAfterMetadata = revisionsOf(
		await listRevisions(admin, NEWS_COLLECTION, entry.entryId!),
	).total;
	expect(
		revisionsAfterMetadata,
		"taxonomy/SEO/byline writes create no content revisions (they are live metadata, not staged content)",
	).toBe(revisionsBeforeMetadata);
});

// ---------------------------------------------------------------------------
// E. Shared media identity: asset changes are current-state only (US6.2)
// ---------------------------------------------------------------------------

test("shared media: asset metadata changes are current-state only; the content revision keeps the selection identity, with no byte or availability claim", async () => {
	gateDocuments();

	// A published Document whose required file selects the uploaded asset by
	// its native media id (the shared identity).
	const media = await uploadSyntheticMedia(admin);
	expect(media.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	const document = await createSyntheticEntry(admin, DOCUMENTS_COLLECTION, {
		data: { title: uniqueTitle("shared-media-document"), file: { id: media.mediaId! } },
	});
	expect(document.result.ok, "the document fixture must save").toBe(true);
	expect(
		(await publishEntry(admin, DOCUMENTS_COLLECTION, document.entryId!)).ok,
		"the document fixture must publish",
	).toBe(true);

	// The content revision carries the file selection as the media IDENTITY
	// only — `{ id }`, not a copy of the asset or its bytes.
	const listing = revisionsOf(
		await listRevisions(admin, DOCUMENTS_COLLECTION, document.entryId!),
	);
	expect(listing.total, "the published document has its promoted live revision").toBeGreaterThan(0);
	const revisionData = listing.items[0]?.data as Record<string, unknown> | undefined;
	const revisionFile = revisionData?.file as Record<string, unknown> | undefined;
	expect(
		revisionFile?.id,
		"the revision's file value is the shared media identity (an id selection, not an asset copy)",
	).toBe(media.mediaId!);

	// An authorized current-state asset change: alternative text and caption
	// on the media item itself (mediaUpdateBody) — immediately current for
	// every consumer of the shared asset, with no publication step.
	const altText = `${SYNTHETIC_FIXTURE_MARK} current alt`;
	const captionText = `${SYNTHETIC_FIXTURE_MARK} current caption`;
	const assetUpdate = await cmsRequest(
		admin,
		`/_emdash/api/media/${encodeURIComponent(media.mediaId!)}`,
		{ method: "PUT", body: { alt: altText, caption: captionText } },
	);
	expect(
		assetUpdate.ok,
		`the native media asset metadata update must succeed (${nativeRefusalOf(assetUpdate)})`,
	).toBe(true);
	const asset = nativeItemOf(
		await cmsRequest(admin, `/_emdash/api/media/${encodeURIComponent(media.mediaId!)}`),
	);
	expect(asset?.alt, "the changed asset metadata reads back as current state").toBe(altText);
	expect(asset?.caption, "the changed caption reads back as current state").toBe(captionText);

	// The content selection keeps pointing at the SAME shared identity — the
	// asset change did not fork a copy, and the content revision did not
	// freeze the asset's metadata: the document read reflects the current
	// asset state through the unchanged id. No immutable-bytes, availability
	// or retention guarantee is claimed or tested here (D-REF deferred).
	const documentCurrent = nativeItemOf(
		await readEntry(admin, DOCUMENTS_COLLECTION, document.entryId!),
	);
	const currentFile = dataOfItem(documentCurrent).file as Record<string, unknown> | undefined;
	expect(
		currentFile?.id,
		"the content selection keeps pointing at the SAME shared media identity after the asset change",
	).toBe(media.mediaId!);
});

// ---------------------------------------------------------------------------
// Unauthenticated control (US6.1): the revision surfaces stay authorization-gated
// ---------------------------------------------------------------------------

test("unauthenticated revision-surface reads are authorization refusals, never data exposure", async () => {
	gatePages();

	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("unauthenticated-revisions") },
	});
	expect(entry.result.ok, "the unauthenticated-control fixture must save").toBe(true);

	// One unauthenticated read against each revision surface (listing and
	// compare) with no credential sent: only the authorization layer can
	// refuse (the accepted control shape; the URL is built from the actor's
	// runner-configured origin).
	const base = `${admin.baseUrl}/`;
	for (const [label, path] of [
		["revision listing", `/_emdash/api/content/${PAGES_COLLECTION}/${entry.entryId}/revisions`],
		["live/draft compare", `/_emdash/api/content/${PAGES_COLLECTION}/${entry.entryId}/compare`],
	] as const) {
		const response = await fetch(new URL(path, base), { redirect: "error" });
		let parsed: unknown;
		try {
			parsed = await response.json();
		} catch {
			parsed = { nonJsonBody: await response.text() };
		}
		const result: NativeResult = { ok: response.ok, status: response.status, body: parsed };
		expect(
			result.status,
			`${label}: an unauthenticated native read must be refused by the authorization layer with 401`,
		).toBe(401);
		expect(result.ok, `${label}: the refusal is never success`).toBe(false);
		const error = result.body as { error?: { code?: unknown } };
		expect(
			error?.error?.code,
			`${label}: the refusal carries its native authorization code`,
		).toBe("UNAUTHORIZED");
	}
});

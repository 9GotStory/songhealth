// Native revisions and concurrency (Feature 002 T020, US6; specs/002-cms-content-model/).
//
// The suite checks EmDash's editorial safety on the Songhealth collections:
// - optimistic concurrency: a current `_rev` succeeds and a stale one is refused for update and
//   publish, concurrent saves never silently overwrite newer work, and an uncertain outcome is
//   read again before any retry;
// - revision history and restoring a chosen revision;
// - autosave (`skipRevision`) and recovering an interrupted edit from its pending draft;
// - edit locks: the holder's lease, a second writer's ENTRY_LOCKED refusal, the documented
//   `overrideLock` control, and release;
// - published versus pending content data and reference selections;
// - taxonomy, SEO, byline and shared media metadata, which are current state and are not staged
//   with a content revision.
//
// Platform behaviour relied on (emdash 1.1.0; where the unversioned docs differ, the pinned
// source wins: the lock route acquires with POST, not PUT):
// - `_rev` (src/api/rev.ts) is base64("version:updated_at"), and a mismatch answers 409
//   CONFLICT. Staged saves, publish and restore all bump `version`, so any newer write
//   invalidates an older token (src/database/repositories/content.ts
//   replaceDraftRevisionForUpdate).
// - Draft staging (src/emdash-runtime.ts handleContentUpdate): on a collection with revisions,
//   the content columns hold published data only, and each data or reference save becomes a new
//   revision staged as `draft_revision_id`. Creating an entry stages no revision.
// - History (src/database/repositories/revision.ts; GET …/revisions, content:read_drafts,
//   `limit` 1–100) lists the newest first and is pruned to 50 per entry: a working history, not
//   an audit archive.
// - Restore (src/api/handlers/revision.ts handleRevisionRestore) claims the entry lock, writes
//   the snapshot back through a version fence (409 on a concurrent change), records a restore
//   revision and bumps `version`.
// - Autosave is `skipRevision` on the ordinary update (src/api/schemas/content.ts
//   contentUpdateBody), which replaces the previous autosave revision. There is no autosave
//   endpoint and no session-recovery API: the pending draft is the recovery.
// - Reads (src/emdash-runtime.ts hydrateDraftData): with a pending draft, `item.data` is the
//   draft and `item.liveData` the published values. Compare (…/compare) returns `hasChanges`,
//   `live` and `draft`; the draft's `_references` hold translation-group ids.
// - Publish (src/database/repositories/content.ts publish) promotes the draft revision and its
//   staged reference selection (src/api/handlers/content.ts handleContentPublish).
// - Edit locks (src/api/handlers/entry-lock.ts): GET reads the holder, POST takes or refreshes a
//   7-minute lease, DELETE releases it. A second account's POST without `takeover` answers 200
//   with `heldByCaller: false`. Every write claims the lock first, so another holder's lease
//   refuses it with 409 ENTRY_LOCKED unless the write sends `overrideLock: true`. Locking is on
//   for every Songhealth collection (migration 075 default).
// - Live metadata (src/emdash-runtime.ts DRAFT_ONLY_UPDATE_KEYS): `taxonomies`, `seo`,
//   `bylines`, `authorId` and `publishedAt` are written to the current row, create no revision
//   and never publish a pending draft. An SEO write on a collection without SEO is refused with
//   400 VALIDATION_ERROR (src/api/handlers/content.ts).
// - Fixture terms go through POST, GET and DELETE /_emdash/api/taxonomies/{name}/terms, and
//   bylines through POST and DELETE /_emdash/api/admin/bylines. A byline is found again through
//   its listing (`search`, `cursor`), because 1.1.0 has no byline-by-slug read. Only a 4xx
//   proves that a create did not commit: the repositories commit before they read the record
//   back (src/database/repositories/taxonomy.ts and byline.ts). After a 5xx or a lost response
//   the fixture is looked up before anything else. Malformed observations stay unknown: a lock
//   counts as unheld only on an explicit `holder: null`, a release only on `released: true` or
//   a confirming read.
// - Media metadata (PUT /_emdash/api/media/{id}) is current state. A revision keeps only the
//   media id, and no availability is guaranteed.
//
// Credentials and fixtures:
// - The development Administrator PAT (SONGHEALTH_DEV_ACCESS) prepares fixtures and never stands
//   in for another role.
// - The second-writer lock cases need the role fixture PAT (SONGHEALTH_ROLE_FIXTURE_ACCESS) and
//   skip without it. Its role changes run through withNativeRole, which restores the role on
//   every exit path.
// - Fixtures are synthetic. Cleanup runs after each test, with an afterAll safety net for both
//   actors and the synthetic term and byline.

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createSyntheticEntry,
	currentRev,
	devAdminActor,
	getMe,
	nativeDataOf,
	nativeErrorOf,
	nativeItemOf,
	nativeRefusalOf,
	nativeRevOf,
	NATIVE_ROLES,
	publishEntry,
	readEntry,
	ROLE_FIXTURE_CREDENTIAL_ENV,
	roleFixtureActor,
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

/**
 * The `personnel` collection for the SEO boundary: the content model enables
 * SEO on the nine public collections but not on personnel (#51, approved Q9),
 * so a personnel SEO write is the native refusal.
 */
const PERSONNEL_COLLECTION = "personnel";

/** The shared `topic` taxonomy (attached to news; T004/T013/T018 standing). */
const TOPIC_TAXONOMY = "topic";

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
	{ outcome: "ready" } | { outcome: "missing" } | { outcome: "misconfigured"; detail: string };

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
let personnelReadiness: CollectionReadiness = { outcome: "missing" };
/**
 * Native per-collection SEO opt-in (`hasSeo`) as read by beforeAll. The
 * content model enables SEO on news but not on personnel, so news exercises
 * the SEO side-write path and personnel the native refusal.
 */
const seoEnabled = new Map<string, boolean>();

/**
 * Registration for the synthetic topic term — retained from BEFORE its
 * creation until its deletion is proven (corrective round 1, F1).
 */
let syntheticTerm: { taxonomy: string; slug: string } | undefined;

/**
 * Registration for the synthetic byline — the owned unique slug is retained
 * from BEFORE creation; `id` is present once a native response (create
 * response or supported listing) established it, and deletion reconciles it
 * through the listing when absent (corrective round 1, F1).
 */
let syntheticByline: { id?: string; slug: string } | undefined;

/** One clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** Truthful schema gate for one exercised collection (T014 gateCollection shape). */
function gateCollection(readiness: CollectionReadiness, slug: string, what: string): void {
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
	gateCollection(documentsReadiness, DOCUMENTS_COLLECTION, "the shared-media identity fixtures");
}

function gatePersonnel(): void {
	gateCollection(personnelReadiness, PERSONNEL_COLLECTION, "the SEO-boundary fixture");
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
		`set ${ROLE_FIXTURE_CREDENTIAL_ENV} to the role fixture PAT`,
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

/**
 * The selected ids for one reference field on a compare side (`_references`),
 * or undefined when the side carries no selection for the field. The values
 * are native translation-group identities exactly as the pinned compare
 * handler emits them — compared by identity, never decoded or reconstructed
 * (corrective round 1, F3).
 */
function referenceSelectionOf(
	side: Record<string, unknown> | null | undefined,
	fieldSlug: string,
): string[] | undefined {
	const references = side?._references as Record<string, unknown> | undefined;
	const selection = references?.[fieldSlug];
	if (!Array.isArray(selection)) return undefined;
	return selection.filter((value): value is string => typeof value === "string");
}

/** True when a compare side carries NO selection for the field (F3 helper). */
function hasNoSelection(
	side: Record<string, unknown> | null | undefined,
	fieldSlug: string,
): boolean {
	const selection = referenceSelectionOf(side, fieldSlug);
	return selection === undefined || selection.length === 0;
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
async function restoreRevision(actor: CmsActor, revisionId: string): Promise<NativeResult> {
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
 * Native presence of one owned synthetic term, read through the supported
 * term read (GET /_emdash/api/taxonomies/{name}/terms/{slug}: 404 proves
 * absence, success proves presence, anything else is unknown). Never throws —
 * an unreadable state is data, not an exception (corrective round 1, F1).
 */
async function termPresence(
	slug: string,
): Promise<
	{ presence: "absent" } | { presence: "present" } | { presence: "unknown"; detail: string }
> {
	const termPath = `/_emdash/api/taxonomies/${encodeURIComponent(TOPIC_TAXONOMY)}/terms/${encodeURIComponent(slug)}`;
	let probe: NativeResult;
	try {
		probe = await cmsRequest(admin, termPath);
	} catch (cause) {
		return {
			presence: "unknown",
			detail: `the term read failed before reaching the app (${renderFailure(cause)})`,
		};
	}
	if (probe.status === 404) return { presence: "absent" };
	if (probe.ok) return { presence: "present" };
	return { presence: "unknown", detail: `term read: ${nativeRefusalOf(probe)}` };
}

/**
 * Native presence and id of one owned synthetic byline, reconciled through
 * the SUPPORTED LISTING (GET /_emdash/api/admin/bylines?search=…&limit=…,
 * cursor-paginated `{ items: [{ id, slug, … }], nextCursor? }`). There is no
 * byline-by-slug GET in pinned 1.1.0, so the exact owned slug is searched and
 * the returned record's id is used — never an assumed id and never a custom
 * reconstruction (corrective round 1, F1). The traversal is bounded and
 * treats a malformed or cyclic page as unknown, never as proven absence.
 */
async function bylinePresenceBySlug(
	slug: string,
): Promise<
	| { presence: "absent" }
	| { presence: "present"; id: string }
	| { presence: "unknown"; detail: string }
> {
	const MAX_PAGES = 100;
	const followedCursors = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < MAX_PAGES; page += 1) {
		let result: NativeResult;
		try {
			result = await cmsRequest(admin, "/_emdash/api/admin/bylines", {
				searchParams: {
					search: slug,
					limit: "100",
					...(cursor !== undefined ? { cursor } : {}),
				},
			});
		} catch (cause) {
			return {
				presence: "unknown",
				detail: `the byline listing failed before reaching the app (${renderFailure(cause)})`,
			};
		}
		if (!result.ok) {
			return { presence: "unknown", detail: `byline listing: ${nativeRefusalOf(result)}` };
		}
		const data = nativeDataOf(result);
		const items = data?.items;
		if (!Array.isArray(items)) {
			return {
				presence: "unknown",
				detail: "the byline listing success page lacked its items array",
			};
		}
		for (const item of items as Array<Record<string, unknown>>) {
			if (item?.slug === slug) {
				// An EXACT slug match settles presence immediately — but only
				// with a usable record id. A matching record whose id is
				// missing or malformed is UNKNOWN, never absence (corrective
				// round 2, R2-F3): continuing the traversal could classify the
				// page as exhausted and drop a live registration.
				if (typeof item.id === "string") {
					return { presence: "present", id: item.id };
				}
				return {
					presence: "unknown",
					detail: "a byline matching the exact owned slug carried no usable id",
				};
			}
		}
		const nextCursor: unknown = data?.nextCursor;
		if (nextCursor === undefined || nextCursor === "") {
			return { presence: "absent" };
		}
		if (
			typeof nextCursor !== "string" ||
			nextCursor === cursor ||
			followedCursors.has(nextCursor)
		) {
			return {
				presence: "unknown",
				detail: "the byline listing pagination stalled or was malformed",
			};
		}
		if (cursor !== undefined) followedCursors.add(cursor);
		cursor = nextCursor;
	}
	return { presence: "unknown", detail: "the byline listing exceeded its bounded page budget" };
}

/**
 * Ensure one clearly-synthetic topic term exists and is registered for
 * teardown, with creation INTENT separated from established OWNERSHIP
 * (corrective rounds 2–3, R2-F1/R3-F1). The OWNED registration is
 * established only by (a) a definite native create success, or (b) the
 * ambiguous-outcome recovery — the creation's outcome does not prove a
 * rollback (transport loss, or a 5xx TERM_CREATE_ERROR: the pinned
 * repository commits the insert and only then reads the record back,
 * src/database/repositories/taxonomy.ts:189-218, so a post-commit read
 * failure surfaces as an observed 500 while the term exists,
 * src/api/handlers/taxonomies.ts:1111-1113) — and a supported native read
 * finds the record under this run's fresh random slug. A 4xx refusal is
 * SOURCE-PROVEN non-commit: every 4xx these create routes answer (route
 * authorization, body validation, and the duplicate-slug CONFLICT of
 * src/api/handlers/taxonomies.ts:980-987) is decided BEFORE the insert, so
 * no ownership is claimed, nothing is registered, and a pre-existing record
 * carrying the same slug is never deleted. An ambiguous creation reconciled
 * ABSENT never landed (nothing registered, original failure rethrown); an
 * unreadable reconciliation keeps the registration for the read-first
 * safety-net teardown and fails loudly. The original server failure is
 * always reported — never silently converted into a successful creation,
 * never blindly retried.
 */
async function ensureSyntheticTopicTerm(): Promise<string> {
	if (syntheticTerm !== undefined) {
		return syntheticTerm.slug;
	}
	const slug = `${SYNTHETIC_FIXTURE_MARK}-topic-${crypto.randomUUID().slice(0, 8)}`;
	// The intent is local until ownership is established: only a success
	// envelope or the ambiguous-outcome recovery below may register an owned
	// fixture for teardown.
	let created: NativeResult | undefined;
	let unprovenFailure: unknown;
	try {
		created = await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${encodeURIComponent(TOPIC_TAXONOMY)}/terms`,
			{ method: "POST", body: { slug, label: `${SYNTHETIC_FIXTURE_MARK} topic term` } },
		);
	} catch (cause) {
		unprovenFailure = cause;
	}
	if (created !== undefined && created.ok) {
		// Definite commit by this run: owned.
		syntheticTerm = { taxonomy: TOPIC_TAXONOMY, slug };
		return slug;
	}
	if (created !== undefined && created.status >= 400 && created.status < 500) {
		// SOURCE-PROVEN non-commit (R3-F1): every 4xx from these create routes
		// precedes the insert — authorization, body validation, and the
		// duplicate-slug CONFLICT are all decided before any write. Never
		// owned, never registered, never deleted: a same-slug record, if one
		// exists, pre-existed this request and stays untouched.
		throw new Error(
			`creating the synthetic topic term was refused (${nativeRefusalOf(created)}); no ownership is claimed and nothing is registered — a same-slug record the native duplicate guard reports pre-existed this request and is not deleted`,
		);
	}
	if (created !== undefined) {
		// A 5xx (TERM_CREATE_ERROR) does NOT prove rollback (R3-F1): the
		// pinned path commits the insert and only then reads the record back,
		// so the observed server error may carry a committed fixture. Keep the
		// exact attempted identity and reconcile below; the original failure
		// is reported in every outcome.
		unprovenFailure = new Error(
			`the term create answered a server error that does not prove rollback (${nativeRefusalOf(created)}; the pinned repository commits the insert before the read-back that failed)`,
		);
	}
	// Ambiguous (unobserved or non-rollback-proving) creation outcome:
	// reconcile through the supported native term read.
	const reconciled = await termPresence(slug);
	if (reconciled.presence === "present") {
		// Ambiguous-commit recovery (R3-F1): a present record under this run's
		// fresh random slug is recovered as owned so teardown cleans it; the
		// original server failure is reported, not converted into success.
		syntheticTerm = { taxonomy: TOPIC_TAXONOMY, slug };
		console.log(
			`[cms-revisions] synthetic term creation outcome does not prove rollback (${renderFailure(unprovenFailure)}); native read confirms the record is present — recovered as owned and registered for teardown`,
		);
		return slug;
	}
	if (reconciled.presence === "absent") {
		throw new Error(
			`synthetic term creation did not land (reconciled absent after: ${renderFailure(unprovenFailure)})`,
		);
	}
	// Unreadable reconciliation: keep the registration (the read-first
	// teardown decides again from actual state) and fail loudly with the
	// original failure retained.
	syntheticTerm = { taxonomy: TOPIC_TAXONOMY, slug };
	throw new Error(
		`synthetic term creation outcome does not prove rollback (${renderFailure(unprovenFailure)}) and reconciliation could not settle it (${reconciled.detail}); the slug stays registered for the read-first safety-net teardown`,
	);
}

/**
 * Delete the registered synthetic term with the full uncertain-outcome
 * protocol (the accepted cms-authoring.spec.ts contract, corrective round 1
 * F1): native presence is verified BEFORE every DELETE (an already-absent
 * term resolves with no mutation; an unreadable state never sees a DELETE);
 * an uncertain DELETE (lost response) is reconciled through a read before
 * EXACTLY ONE re-attempt; a definite refusal is reconciled through a read
 * before any absence claim. The registration is retained until deletion is
 * actually proven.
 */
async function deleteSyntheticTerm(): Promise<void> {
	const term = syntheticTerm;
	if (term === undefined) return;
	const termPath = `/_emdash/api/taxonomies/${term.taxonomy}/terms/${encodeURIComponent(term.slug)}`;
	const resolved = (): void => {
		syntheticTerm = undefined;
	};
	const unresolved = (detail: string): never => {
		throw new Error(
			`the owned synthetic ${term.taxonomy} term '${term.slug}' could not be proven deleted (${detail}); it stays registered for the safety-net retry`,
		);
	};

	// Entry reconciliation: verify presence BEFORE any DELETE.
	const entry = await termPresence(term.slug);
	if (entry.presence === "absent") {
		resolved();
		return;
	}
	if (entry.presence === "unknown") {
		unresolved(`the pre-deletion presence read could not establish native state (${entry.detail})`);
	}

	let removal: NativeResult | undefined;
	try {
		removal = await cmsRequest(admin, termPath, { method: "DELETE" });
	} catch (cause) {
		// Lost response: the deletion outcome is uncertain — read native state
		// BEFORE any repeated DELETE.
		const afterLoss = await termPresence(term.slug);
		if (afterLoss.presence === "absent") {
			resolved();
			return;
		}
		if (afterLoss.presence === "present") {
			try {
				removal = await cmsRequest(admin, termPath, { method: "DELETE" });
			} catch (causeAgain) {
				unresolved(
					`transport failure on the re-attempted deletion after a verified-present read (${renderFailure(causeAgain)})`,
				);
			}
		} else {
			unresolved(`transport failure on the deletion and ${afterLoss.detail}`);
		}
	}
	const deletion: NativeResult = removal!;
	if (deletion.ok || deletion.status === 404) {
		resolved();
		return;
	}
	// Definite refusal: reconcile through a native read before any claim.
	const afterRefusal = await termPresence(term.slug);
	if (afterRefusal.presence === "absent") {
		resolved();
		return;
	}
	unresolved(
		afterRefusal.presence === "present"
			? `${nativeRefusalOf(deletion)}; a native read still finds the term`
			: `${nativeRefusalOf(deletion)}; ${afterRefusal.detail}`,
	);
}

/**
 * Ensure one clearly-synthetic native byline entity exists (bylines:manage;
 * POST /_emdash/api/admin/bylines) and is registered for teardown, with the
 * R2-F1/R3-F1 ownership discipline. A 4xx refusal is SOURCE-PROVEN
 * non-commit — every 4xx these create routes answer (route authorization,
 * body validation, and the duplicate-slug CONFLICT of
 * src/api/handlers/bylines.ts:190-223) is decided BEFORE the insert — so it
 * never claims ownership, never registers, and never deletes a pre-existing
 * same-slug record. A 5xx (BYLINE_CREATE_ERROR) does NOT prove rollback: the
 * pinned repository commits the insert transaction and only then performs
 * findById (src/database/repositories/byline.ts:770-805), and a failure of
 * that post-commit read is caught and returned as the observed server error
 * (src/api/handlers/bylines.ts:241-255) while the byline exists. Ownership
 * is therefore established by (a) a definite success envelope (its id from
 * the response, or reconciled through the supported listing when the
 * envelope carries none), or (b) the ambiguous-outcome recovery — transport
 * loss or a non-rollback-proving server error — with the listing finding
 * the record under this run's fresh random slug. An ambiguous creation
 * reconciled ABSENT never landed; an unreadable reconciliation keeps the
 * registration (id resolved by the read-first teardown listing) and fails
 * loudly. The original server failure is always reported — never silently
 * converted into successful creation, never blindly retried.
 */
async function ensureSyntheticByline(): Promise<string> {
	if (syntheticByline?.id !== undefined) {
		return syntheticByline.id;
	}
	const slug = `${SYNTHETIC_FIXTURE_MARK}-byline-${crypto.randomUUID().slice(0, 8)}`;
	// The intent is local until ownership is established.
	let created: NativeResult | undefined;
	let unprovenFailure: unknown;
	try {
		created = await cmsRequest(admin, "/_emdash/api/admin/bylines", {
			method: "POST",
			body: { slug, displayName: `${SYNTHETIC_FIXTURE_MARK} byline` },
		});
	} catch (cause) {
		unprovenFailure = cause;
	}
	if (created !== undefined && created.ok) {
		// Definite commit by this run: owned. The pinned create handler
		// returns the byline object directly in `data`; fall back defensively
		// to `data.item.id`.
		const data = nativeDataOf(created);
		const directId = typeof data?.id === "string" ? data.id : undefined;
		const itemId =
			typeof nativeItemOf(created)?.id === "string"
				? (nativeItemOf(created)!.id as string)
				: undefined;
		const id = directId ?? itemId;
		if (id !== undefined) {
			syntheticByline = { id, slug };
			return id;
		}
		// Definite commit with an unusable envelope: reconcile the id through
		// the supported listing (never abandon the owned entity).
		const listed = await bylinePresenceBySlug(slug);
		if (listed.presence === "present") {
			syntheticByline = { id: listed.id, slug };
			return listed.id;
		}
		// Ownership is definite; only the id is unresolved. Register without
		// the id — the read-first teardown listing reconciles it (absent there
		// resolves the registration with nothing further to delete).
		syntheticByline = { slug };
		throw new Error(
			`the byline create succeeded but its id could not be established from the response or the supported listing (${
				listed.presence === "absent" ? "the listing proves absence" : listed.detail
			}); the slug stays registered and the read-first teardown reconciles it`,
		);
	}
	if (created !== undefined && created.status >= 400 && created.status < 500) {
		// SOURCE-PROVEN non-commit (R3-F1): every 4xx from these create routes
		// precedes the insert. Never owned, never registered, never deleted.
		throw new Error(
			`creating the synthetic byline was refused (${nativeRefusalOf(created)}); no ownership is claimed and nothing is registered — a same-slug record the native duplicate guard reports pre-existed this request and is not deleted`,
		);
	}
	if (created !== undefined) {
		// A 5xx (BYLINE_CREATE_ERROR) does NOT prove rollback (R3-F1): the
		// pinned path commits the insert before the read-back whose failure
		// produced this envelope. Keep the exact attempted identity and
		// reconcile below; the original failure is reported in every outcome.
		unprovenFailure = new Error(
			`the byline create answered a server error that does not prove rollback (${nativeRefusalOf(created)}; the pinned repository commits the insert before the read-back that failed)`,
		);
	}
	// Ambiguous (unobserved or non-rollback-proving) creation outcome:
	// reconcile the exact attempted slug through the supported listing.
	const reconciled = await bylinePresenceBySlug(slug);
	if (reconciled.presence === "present") {
		// Ambiguous-commit recovery (R3-F1): the record is recovered as owned
		// so teardown cleans it; the original server failure is reported, not
		// converted into success.
		syntheticByline = { id: reconciled.id, slug };
		console.log(
			`[cms-revisions] synthetic byline creation outcome does not prove rollback (${renderFailure(unprovenFailure)}); the supported listing finds the record — recovered as owned and registered for teardown`,
		);
		return reconciled.id;
	}
	if (reconciled.presence === "absent") {
		throw new Error(
			`synthetic byline creation did not land (reconciled absent after: ${renderFailure(unprovenFailure)})`,
		);
	}
	// Unreadable reconciliation: keep the registration without an id (the
	// read-first teardown listing decides again from actual state).
	syntheticByline = { slug };
	throw new Error(
		`synthetic byline creation outcome does not prove rollback (${renderFailure(unprovenFailure)}) and reconciliation could not settle it (${reconciled.detail}); the slug stays registered for the read-first safety-net teardown`,
	);
}

/**
 * Delete the registered synthetic byline with the same uncertain-outcome
 * protocol as the term (corrective round 1, F1), reconciled through the
 * supported listing (no byline-by-slug GET exists): the exact owned slug is
 * searched BEFORE any DELETE to establish presence AND the record id; only a
 * proven-present byline is deleted (by its listed id); an uncertain DELETE is
 * reconciled through the listing before EXACTLY ONE re-attempt; an unreadable
 * state is reported without another mutation.
 */
async function deleteSyntheticByline(): Promise<void> {
	const byline = syntheticByline;
	if (byline === undefined) return;
	const resolved = (): void => {
		syntheticByline = undefined;
	};
	const unresolved = (detail: string): never => {
		throw new Error(
			`the owned synthetic byline '${byline.slug}' could not be proven deleted (${detail}); it stays registered for the safety-net retry`,
		);
	};

	// Entry reconciliation: establish presence and the record id BEFORE any
	// DELETE (a registration without an id is resolved here, never assumed).
	const entry = await bylinePresenceBySlug(byline.slug);
	if (entry.presence === "absent") {
		resolved();
		return;
	}
	if (entry.presence === "unknown") {
		throw new Error(
			`the owned synthetic byline '${byline.slug}' could not be proven deleted (the pre-deletion listing could not establish native state: ${entry.detail}); it stays registered for the safety-net retry`,
		);
	}
	let bylineId = entry.id;
	const bylinePath = `/_emdash/api/admin/bylines/${encodeURIComponent(bylineId)}`;

	let removal: NativeResult | undefined;
	try {
		removal = await cmsRequest(admin, bylinePath, { method: "DELETE" });
	} catch (cause) {
		// Lost response: reconcile through the listing BEFORE any re-attempt.
		const afterLoss = await bylinePresenceBySlug(byline.slug);
		if (afterLoss.presence === "absent") {
			resolved();
			return;
		}
		if (afterLoss.presence === "present") {
			bylineId = afterLoss.id;
			try {
				removal = await cmsRequest(
					admin,
					`/_emdash/api/admin/bylines/${encodeURIComponent(bylineId)}`,
					{ method: "DELETE" },
				);
			} catch (causeAgain) {
				unresolved(
					`transport failure on the re-attempted deletion after a verified-present listing (${renderFailure(causeAgain)})`,
				);
			}
		} else {
			unresolved(`transport failure on the deletion and ${afterLoss.detail}`);
		}
	}
	const deletion: NativeResult = removal!;
	if (deletion.ok || deletion.status === 404) {
		resolved();
		return;
	}
	const afterRefusal = await bylinePresenceBySlug(byline.slug);
	if (afterRefusal.presence === "absent") {
		resolved();
		return;
	}
	unresolved(
		afterRefusal.presence === "present"
			? `${nativeRefusalOf(deletion)}; the supported listing still finds the byline`
			: `${nativeRefusalOf(deletion)}; ${afterRefusal.detail}`,
	);
}

// ---------------------------------------------------------------------------
// Edit-lease reconciliation (corrective round 1, F2)
// ---------------------------------------------------------------------------

/**
 * The live lease state read through the native lock endpoint: "held" (with
 * the holder's userId), "unheld", or "unknown". Shape-strict (corrective
 * round 2, R2-F3): only a VALID lock-status response with an EXPLICIT
 * `holder: null` proves unheld — a missing data object, a missing `holder`
 * key, or a malformed holder value is UNKNOWN, never unheld, so a malformed
 * observation can never release a live lease registration. Never throws.
 */
async function leasePresence(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<
	| { state: "held"; holderUserId: string }
	| { state: "unheld" }
	| { state: "unknown"; detail: string }
> {
	let read: NativeResult;
	try {
		read = await readEntryLock(actor, collection, id);
	} catch (cause) {
		return {
			state: "unknown",
			detail: `the lock read failed before reaching the app (${renderFailure(cause)})`,
		};
	}
	if (!read.ok) {
		return { state: "unknown", detail: `lock read: ${nativeRefusalOf(read)}` };
	}
	const data = nativeDataOf(read);
	if (data === undefined) {
		return { state: "unknown", detail: "the lock read success carried no data object" };
	}
	const holder: unknown = data.holder;
	// The native unheld status is `{ enabled, holder: null, heldByCaller }` —
	// only the explicit null proves no lease (R2-F3).
	if (holder === null) {
		return { state: "unheld" };
	}
	if (holder === undefined) {
		return { state: "unknown", detail: "the lock read success carried no holder key" };
	}
	if (typeof holder !== "object") {
		return { state: "unknown", detail: "the lock read success carried a malformed holder value" };
	}
	const holderUserId = (holder as Record<string, unknown>).userId;
	if (typeof holderUserId !== "string") {
		return { state: "unknown", detail: "the lock read carried a holder without a usable userId" };
	}
	return { state: "held", holderUserId };
}

/**
 * Failure-safe holder-lease release, run on EVERY exit path of the lock
 * case's role callback (corrective round 1, F2): an assertion or request
 * failure must never strand another account's lease, because the pinned
 * content DELETE used by ordinary fixture cleanup also claims the entry lock
 * and would be refused (409 ENTRY_LOCKED) until the 7-minute lease expires.
 *
 * The reconciliation covers UNCERTAIN ACQUISITION (the acquire response was
 * lost — the read decides whether a lease exists to release) and UNCERTAIN
 * RELEASE (a lost DELETE response is reconciled through a read before
 * EXACTLY ONE re-attempt). It uses only the holder's own supported release —
 * no takeover, no lock override, no write on an unknown state; an unreadable
 * state is reported unresolved instead of mutated.
 */
async function reconcileHolderLease(
	holder: CmsActor,
	collection: string,
	id: string,
): Promise<void> {
	const entryState = await leasePresence(holder, collection, id);
	if (entryState.state === "unheld") {
		return;
	}
	if (entryState.state === "unknown") {
		throw new Error(
			`could not read the entry-lock state to reconcile the holder's lease (${entryState.detail}); cleanup may be refused until the native lease expires`,
		);
	}
	if (entryState.holderUserId !== holder.userId) {
		throw new Error(
			`the lease is held by account ${entryState.holderUserId}, not the fixture holder; no release is issued (only the holder's own supported release is used)`,
		);
	}
	const releaseOnce = async (): Promise<NativeResult> => releaseEntryLock(holder, collection, id);
	let release: NativeResult | undefined;
	try {
		release = await releaseOnce();
	} catch (cause) {
		// Uncertain release: read state BEFORE any re-attempt.
		const afterLoss = await leasePresence(holder, collection, id);
		if (afterLoss.state === "unheld") {
			return;
		}
		if (afterLoss.state === "held" && afterLoss.holderUserId === holder.userId) {
			try {
				release = await releaseOnce();
			} catch (causeAgain) {
				throw new Error(
					`the holder lease release failed before its outcome was known (${renderFailure(cause)}) and the single re-attempt after a verified-held read also failed (${renderFailure(causeAgain)}); the lease may still be held and cleanup may be refused until the native lease expires`,
				);
			}
		} else if (afterLoss.state === "held") {
			throw new Error(
				`the release outcome is unknown and the lease is now held by account ${afterLoss.holderUserId}; no further mutation is issued`,
			);
		} else {
			throw new Error(
				`the release outcome is unknown (${renderFailure(cause)}) and the follow-up lock read could not settle it (${afterLoss.detail}); the lease may still be held`,
			);
		}
	}
	const deletion: NativeResult = release!;
	if (deletion.ok) {
		// Shape-strict resolution (corrective round 2, R2-F3): only an
		// EXPLICIT `released: true` resolves directly. `released: false`, a
		// missing flag, or a malformed value settles ONLY through a valid
		// confirming lock read that proves an explicit unheld state — a
		// malformed success response is never accepted as released.
		const releasedFlag = nativeDataOf(deletion)?.released;
		if (releasedFlag === true) {
			return;
		}
		const confirmed = await leasePresence(holder, collection, id);
		if (confirmed.state === "unheld") {
			return;
		}
		throw new Error(
			`the native release response carried ${
				releasedFlag === false ? "released=false" : "no explicit released:true"
			} and the confirming lock read shows ${
				confirmed.state === "held"
					? `account ${confirmed.holderUserId} still holding`
					: "an unreadable state"
			}; the lease may still be held`,
		);
	}
	// Definite refusal: reconcile through the read before any claim.
	const afterRefusal = await leasePresence(holder, collection, id);
	if (afterRefusal.state === "unheld") {
		return;
	}
	throw new Error(
		`the holder lease release was refused (${nativeRefusalOf(deletion)}) and the lease read still shows ${
			afterRefusal.state === "held"
				? `account ${afterRefusal.holderUserId} holding`
				: "an unreadable state"
		}; cleanup may be refused until the native lease expires`,
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
	expect(result.status, `${caseLabel}: a stale _rev precondition is refused with 409`).toBe(409);
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
	expect(result.ok, `${caseLabel}: the write must be refused, not reported as success`).toBe(false);
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
	// The development Administrator. This hook creates no owned fixtures.
	admin = await devAdminActor();

	// The role fixture, another account of the same application: a configured credential that
	// fails to load or verify fails loudly, and an absent one leaves the second-writer lock cases
	// to their skip.
	roleFixture = await roleFixtureActor(admin);
	roleFixtureOriginalRole = roleFixture?.role;

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
		seoEnabled.set(collection, nativeItemOf(schemaRead)?.hasSeo === true);
		const fields = nativeItemOf(schemaRead)?.fields;
		expect(Array.isArray(fields), `the ${collection} schema read must include fields`).toBe(true);
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
	personnelReadiness = await readinessOf(PERSONNEL_COLLECTION);
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
// A. Uncertain mutation outcome — lost acknowledgment (US6.6, FR-026)
// ---------------------------------------------------------------------------

/**
 * Bounded test-only lost-acknowledgment wrapper (corrective round 1, F5):
 * issues the REAL native update, awaits it, then DISCARDS the response
 * envelope and throws — modeling a client whose acknowledgment was lost in
 * transit, so the mutation's commit state is genuinely unknown to the
 * caller. The mutation itself runs against the real native app; only the
 * observation of its outcome is withheld. This is test authoring around a
 * native mutation, not a retry service, scheduler or production protocol.
 */
async function updateWithLostAcknowledgment(
	actor: CmsActor,
	collection: string,
	id: string,
	payload: { data: Record<string, unknown> },
	rev: string,
): Promise<never> {
	await updateEntry(actor, collection, id, { data: payload.data, rev });
	throw new Error(
		"test-only lost acknowledgment: the native update completed server-side but its response was discarded before the outcome was observed",
	);
}

test("uncertain outcome: a lost write acknowledgment is never success, and current state is read before any retry", async () => {
	gatePages();

	const entry = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title: uniqueTitle("uncertain-base") },
	});
	expect(entry.result.ok, "the uncertain-outcome fixture must save").toBe(true);
	const intendedTitle = uniqueTitle("uncertain-intended");
	const revBefore = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);

	// The mutation is issued for real; its acknowledgment is lost. The
	// outcome is UNKNOWN — there is no success envelope, so nothing about
	// the write may be reported as success (F5).
	let acknowledgmentLost = false;
	// Set ONLY from an actually-observed success envelope; by construction
	// none can exist for this write, and the assertion below proves the
	// unknown result is never reported as success.
	let successClaimed = false;
	try {
		await updateWithLostAcknowledgment(
			admin,
			PAGES_COLLECTION,
			entry.entryId!,
			{ data: { title: intendedTitle } },
			revBefore,
		);
		successClaimed = true;
	} catch {
		// The wrapper's thrown error IS the lost acknowledgment: the write's
		// outcome stays UNKNOWN — never converted into success or an assumed
		// failure. (successClaimed is unreachable: the wrapper returns never.)
		acknowledgmentLost = true;
	}
	expect(acknowledgmentLost, "the lost acknowledgment must surface as an unknown outcome").toBe(
		true,
	);
	expect(
		successClaimed,
		"no success envelope exists for the lost write — the unknown result is never reported as success",
	).toBe(false);

	// Reconciliation BEFORE any retry (US6.6/FR-026), decided ONLY from a
	// successful, usable current-state snapshot (corrective round 2, R2-F2):
	// an unreadable or invalid reconciliation read stays UNKNOWN and never
	// authorizes a retry (a failed GET must not masquerade as "not
	// committed"). Reads are safe, so the decision read is repeated a bounded
	// number of times; the precondition for any retry comes from the SAME
	// validated snapshot the decision was made on — a second, unvalidated
	// token read could observe different content than the decision did.
	let decision: "committed" | "absent" | "unknown" = "unknown";
	let decisionRev: string | undefined;
	for (let attempt = 1; attempt <= 3 && decision === "unknown"; attempt += 1) {
		const read = await readEntry(admin, PAGES_COLLECTION, entry.entryId!);
		if (!read.ok) {
			continue;
		}
		const item = nativeItemOf(read);
		const title = dataOfItem(item).title;
		const rev = nativeRevOf(read);
		if (typeof title !== "string" || rev === undefined) {
			// A success response without a usable title/_rev is not a
			// decision-grade snapshot (R2-F3 discipline applied here too).
			continue;
		}
		decision = title === intendedTitle ? "committed" : "absent";
		decisionRev = rev;
	}
	expect(
		decision !== "unknown",
		"the reconciliation must settle on a successful, usable current-state snapshot before any retry decision — an unreadable/invalid state stays unknown and authorizes no retry",
	).toBe(true);
	const committedWithoutAck = decision === "committed";
	let retriedAfterRead = false;
	if (decision === "absent") {
		// Only now — decided from the validated snapshot — is a retry needed,
		// and it carries the precondition OF THAT SNAPSHOT (any state change
		// between snapshot and retry surfaces truthfully as a conflict).
		retriedAfterRead = true;
		const retry = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
			data: { title: intendedTitle },
			rev: decisionRev!,
		});
		expect(
			retry.ok,
			`the reconciled retry carrying the decision snapshot's _rev must succeed (${nativeRefusalOf(retry)})`,
		).toBe(true);
	}

	// Either branch ends with the intended change as the current pending
	// draft data, and the branch taken is reported truthfully.
	const settled = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		dataOfItem(settled).title,
		"the uncertain write settles to the intended content whether it had already committed or the reconciled retry carried it",
	).toBe(intendedTitle);
	console.log(
		`[cms-revisions] uncertain-outcome reconciliation: committed-without-acknowledgment=${String(
			committedWithoutAck,
		)}; retried-after-current-state-read=${String(retriedAfterRead)}`,
	);
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
	expect(
		refusedState?.publishedAt,
		"the refused publish must record no publication time",
	).toBeNull();

	// Re-read current state, then the retry publishes. The CURRENT token is
	// captured immediately before the successful publish and PASSED to it
	// (corrective round 1, F6) — so the post-publish control below reuses a
	// token that was demonstrably valid for THAT publication, and its later
	// refusal proves the publication itself invalidated it (not the earlier
	// update, whose invalidation the first control above already covered).
	const prePublishRev = await currentRev(admin, PAGES_COLLECTION, entry.entryId!);
	const retried = await publishEntry(admin, PAGES_COLLECTION, entry.entryId!, {
		rev: prePublishRev,
	});
	expect(retried.ok, "the retry carrying the CURRENT pre-publish _rev must publish").toBe(true);
	const published = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(published), "the retried publish must show the published state").toBe(
		"published",
	);
	expect(
		dataOfItem(published).title,
		"publication promotes the pending draft data (the bumped write) to the live columns",
	).toBe(dataOfItem(nativeItemOf(newer)).title);

	// The publication itself bumped the row, so the very token that carried
	// it is now stale for a further publish — refused, with the published
	// state preserved by the refusal (F6).
	expectConflictRefusal(
		await publishEntry(admin, PAGES_COLLECTION, entry.entryId!, { rev: prePublishRev }),
		"publishing again with the token the successful publication itself consumed",
	);
	const preservedState = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		statusOfItem(preservedState),
		"the refused second publish must leave the entry published",
	).toBe("published");
	expect(
		dataOfItem(preservedState).title,
		"the refused second publish must leave the promoted data unchanged",
	).toBe(dataOfItem(nativeItemOf(newer)).title);
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
	const initialListing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
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
	const versionBeforeRestore =
		typeof beforeRestore?.version === "number" ? beforeRestore.version : undefined;
	expect(versionBeforeRestore, "the entry carries its native version counter").not.toBeUndefined();

	// Selected native restore of the FIRST save's revision.
	const restored = await restoreRevision(admin, String(listing.items[1]?.id));
	expect(
		restored.ok,
		`the native revision restore must succeed (${nativeRefusalOf(restored)})`,
	).toBe(true);

	// Post-restore read-back. Verified pinned native restore semantics
	// (ContentRepository.restoreRevision, src+dist confirmed and reproduced
	// deterministically against the pinned runtime): the restore inserts a
	// RESTORE-AUDIT revision carrying the restored snapshot, writes the
	// snapshot's field values back into the content columns, and RETAINS the
	// audit revision as the pending-draft pointer — a selected restore
	// re-stages the restored snapshot as the recoverable pending draft
	// (hydrateDraftData) while the restored data itself is live. The retained
	// pointer is the restore-CREATED audit revision (the new history head),
	// NOT the originally-selected revision id, and never null after a
	// restore. The entry stays published and the row's version moved.
	const afterRestore = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(statusOfItem(afterRestore), "restore does not change the published lifecycle state").toBe(
		"published",
	);
	expect(
		dataOfItem(afterRestore).title,
		"the restored content must read back as the selected revision's data",
	).toBe(firstTitle);
	const restoreAuditPointer = nativeItemOf(restored)?.draftRevisionId;
	expect(
		typeof restoreAuditPointer === "string" && restoreAuditPointer.length > 0,
		"the restore response carries the restore-created revision as its pending-draft pointer",
	).toBe(true);
	expect(
		afterRestore?.draftRevisionId,
		"restore re-stages the restored snapshot as the pending draft (the restore-created audit revision is retained, not cleared)",
	).toBe(restoreAuditPointer);
	expect(
		afterRestore?.draftRevisionId,
		"the retained pointer is the restore-created revision, never the originally-selected revision id",
	).not.toBe(String(listing.items[1]?.id));
	const versionAfterRestore =
		typeof afterRestore?.version === "number" ? afterRestore.version : undefined;
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
	expect(listingAfterRestore.total, "the restore appends its audit revision to the history").toBe(
		3,
	);
	expect(
		recordData(listingAfterRestore.items[0]).title,
		"the restore-created revision heads the listing with the restored snapshot",
	).toBe(firstTitle);
	expect(
		listingAfterRestore.items[0]?.authorId,
		"the restore revision records the restoring caller as its author",
	).toBe(admin.userId);
	expect(
		listingAfterRestore.items[0]?.id,
		"the retained pending-draft pointer is exactly the restore-created history head",
	).toBe(restoreAuditPointer);
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
	const firstAutosave = await contentPut(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: autosaveOneTitle },
		skipRevision: true,
	});
	expect(
		firstAutosave.ok,
		`a skipRevision autosave save must succeed (${nativeRefusalOf(firstAutosave)})`,
	).toBe(true);
	let listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(listing.total, "the first autosave stages one pending draft revision").toBe(1);

	// Second autosave: the pinned behavior — the superseded autosave draft
	// revision is REPLACED (deleted), not accumulated.
	const autosaveTwoTitle = uniqueTitle("autosave-two");
	const secondAutosave = await contentPut(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: autosaveTwoTitle },
		skipRevision: true,
	});
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

	// Interrupted-edit draft recovery, exercised IMMEDIATELY after the last
	// AUTOSAVE and before any explicit save (corrective round 1, F4): there
	// is NO session-resume API in pinned 1.1.0 — the native recovery
	// mechanism IS the persisted pending draft revision. A fresh read (a
	// re-opened editor context; nothing from the writing session is reused)
	// must return the AUTOSAVED pending content as the entry's data, with the
	// pre-edit column data exposed as liveData — an interrupted autosave
	// session recovers its unsaved-explicitly work server-side.
	const recoveredAutosave = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, entry.entryId!));
	expect(
		dataOfItem(recoveredAutosave).title,
		"a fresh authorized read recovers the AUTOSAVED pending content after the interrupted edit",
	).toBe(autosaveTwoTitle);
	expect(
		typeof recoveredAutosave?.draftRevisionId === "string",
		"the recovered read identifies the pending draft revision",
	).toBe(true);
	expect(
		liveDataOfItem(recoveredAutosave).title,
		"the recovery read still exposes the pre-edit column data as liveData (the unpublished base)",
	).toBe(createTitle);
	const comparedAutosave = nativeDataOf(
		await compareEntry(admin, PAGES_COLLECTION, entry.entryId!),
	);
	expect(
		comparedAutosave?.hasChanges,
		"a pending draft with no live revision reports changes",
	).toBe(true);
	expect(comparedAutosave?.live, "an unpublished entry has no live revision to compare").toBeNull();
	expect(
		(comparedAutosave?.draft as Record<string, unknown> | null)?.title,
		"the compare draft is the recovered AUTOSAVED pending content",
	).toBe(autosaveTwoTitle);

	// A separate explicit-save/history control AFTER the recovery evidence
	// (F4: kept distinct from the recovery assertion): an ORDINARY save after
	// the autosaves keeps its own revision — the replacement semantics
	// belong to skipRevision alone.
	const explicitTitle = uniqueTitle("autosave-explicit-save");
	const explicitSave = await contentPut(admin, PAGES_COLLECTION, entry.entryId!, {
		data: { title: explicitTitle },
	});
	expect(explicitSave.ok, "the ordinary save after autosaves must succeed").toBe(true);
	listing = revisionsOf(await listRevisions(admin, PAGES_COLLECTION, entry.entryId!));
	expect(listing.total, "an ordinary save after autosaves keeps a new revision").toBe(2);
	expect(
		recordData(listing.items[0]).title,
		"the ordinary save heads the history with its own revision",
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
		// Failure-safe phase shape (corrective round 1, F2): the primary
		// assertions run first, and the holder-lease reconciliation runs on
		// EVERY exit path — an assertion or request failure must never strand
		// the lease for the ordinary fixture cleanup that follows (the pinned
		// content DELETE claims the entry lock too and would be refused until
		// lease expiry). The original failure is preserved and reported
		// alongside any reconciliation failure, never replaced by it.
		let primaryFailure: unknown;
		let primaryFailed = false;
		try {
			// The editor opens the entry: takes the lease.
			const acquired = nativeDataOf(
				await acquireEntryLock(editor, PAGES_COLLECTION, entry.entryId!),
			);
			expect(
				acquired?.enabled,
				"edit locking is enabled for the seed collections (native default)",
			).toBe(true);
			expect(acquired?.heldByCaller, "the acquiring account holds the lease it just took").toBe(
				true,
			);
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
			expect(afterRelease?.holder, "the released entry has no lock holder").toBeNull();
			const unlockedWrite = await updateEntry(admin, PAGES_COLLECTION, entry.entryId!, {
				data: { title: uniqueTitle("lock-post-release-write") },
			});
			expect(
				unlockedWrite.ok,
				`after release the second writer's save must succeed with no override (${nativeRefusalOf(unlockedWrite)})`,
			).toBe(true);
		} catch (cause) {
			primaryFailed = true;
			primaryFailure = cause;
		}
		// F2 tail: reconcile the holder's lease on EVERY exit path — this
		// also covers an uncertain acquisition (a lost acquire response: the
		// read inside decides whether a lease exists to release) and an
		// uncertain release (read before exactly one re-attempt). On the
		// happy path the lease is already released and this is a verified
		// no-op read. This runs BEFORE withNativeRole restores the role and
		// before the ordinary fixture cleanup that a stranded lease would
		// refuse.
		let leaseFailure: unknown;
		let leaseFailed = false;
		try {
			await reconcileHolderLease(editor, PAGES_COLLECTION, entry.entryId!);
		} catch (cause) {
			leaseFailed = true;
			leaseFailure = cause;
		}
		if (primaryFailed && leaseFailed) {
			throw new Error(
				`lock phase failed AND its lease reconciliation is unresolved — primary failure: ${renderFailure(primaryFailure)}; lease reconciliation: ${renderFailure(leaseFailure)}`,
			);
		}
		if (leaseFailed) {
			throw leaseFailure;
		}
		if (primaryFailed) {
			throw primaryFailure;
		}
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

	// The chosen target's native identity for the selection assertions: its
	// translation group as the document's own native read returns it — the
	// exact identity the pinned staging and live-link surfaces carry (the
	// staged `_references` values and compare's live selection are
	// translation-group ids). Compared by identity throughout; no custom
	// reconstruction (corrective round 1, F3).
	const documentItem = nativeItemOf(
		await readEntry(admin, DOCUMENTS_COLLECTION, document.entryId!),
	);
	const documentIdentity =
		typeof documentItem?.translationGroup === "string" ? documentItem.translationGroup : undefined;
	expect(
		documentIdentity,
		"the chosen Document must expose its native translation-group identity",
	).toBeTruthy();

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
	const afterInitialPublish = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(statusOfItem(afterInitialPublish), "the initial publication is live").toBe("published");
	expect(
		afterInitialPublish?.draftRevisionId,
		"a freshly published entry with no edits has no pending draft",
	).toBeNull();

	// The INITIAL live selection baseline (F3): the freshly published page
	// has no documents selection on the live side — compare builds the live
	// `_references` from the actual live links, so this is the live state.
	const comparedBefore = nativeDataOf(await compareEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(comparedBefore?.hasChanges, "a freshly published entry has no pending changes").toBe(
		false,
	);
	const liveBefore = comparedBefore?.live as Record<string, unknown> | null | undefined;
	expect(
		hasNoSelection(liveBefore, "documents"),
		"the initial live selection for documents is empty",
	).toBe(true);

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
	expect(dataOfItem(pending).title, "the authorized read surfaces the pending staged data").toBe(
		pendingTitle,
	);
	expect(
		liveDataOfItem(pending).title,
		"the live published data is preserved untouched under the pending draft",
	).toBe(initialTitle);
	expect(
		typeof pending?.draftRevisionId === "string",
		"the staged edit is identified by its pending draft revision",
	).toBe(true);

	// The compare surface states the same boundary over the revisions: the
	// live revision still carries the published data AND the UNCHANGED live
	// selection (F3: staging must not touch the live links while the draft
	// exists), while the draft carries the staged data and the EXACT staged
	// selection identity — the chosen Document's translation group, not just
	// any single selection.
	const compared = nativeDataOf(await compareEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(compared?.hasChanges, "a staged edit against a live revision reports changes").toBe(true);
	const liveCompare = compared?.live as Record<string, unknown> | null | undefined;
	const draftCompare = compared?.draft as Record<string, unknown> | null | undefined;
	expect(liveCompare?.title, "the compare live side is the published content data").toBe(
		initialTitle,
	);
	expect(
		hasNoSelection(liveCompare, "documents"),
		"the live selection is UNCHANGED while the draft exists (no premature live-link change)",
	).toBe(true);
	expect(draftCompare?.title, "the compare draft side is the staged content data").toBe(
		pendingTitle,
	);
	const stagedSelection = referenceSelectionOf(draftCompare, "documents");
	expect(
		stagedSelection?.length === 1 && stagedSelection[0] === documentIdentity,
		"the pending draft stages EXACTLY the chosen Document's native identity under _references",
	).toBe(true);

	// Publish Changes: the pending content-data and reference edits become
	// the live published state, the draft pointer clears, and compare shows
	// no further changes (the live selection is the promoted one).
	const publishedChanges = await publishEntry(admin, PAGES_COLLECTION, page.entryId!);
	expect(publishedChanges.ok, "publishing the pending changes must succeed").toBe(true);
	const afterPublishChanges = nativeItemOf(await readEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(statusOfItem(afterPublishChanges), "the entry remains published").toBe("published");
	expect(
		dataOfItem(afterPublishChanges).title,
		"the published read-back carries the formerly pending content data",
	).toBe(pendingTitle);
	expect(
		afterPublishChanges?.draftRevisionId,
		"publishing the changes clears the pending draft pointer",
	).toBeNull();
	const comparedAfter = nativeDataOf(await compareEntry(admin, PAGES_COLLECTION, page.entryId!));
	expect(comparedAfter?.hasChanges, "no pending changes remain after publication").toBe(false);
	expect(comparedAfter?.draft, "no draft revision remains after publication").toBeNull();
	const liveAfter = comparedAfter?.live as Record<string, unknown> | null | undefined;
	expect(liveAfter?.title, "the live revision is the promoted content data").toBe(pendingTitle);
	const promotedSelection = referenceSelectionOf(liveAfter, "documents");
	expect(
		promotedSelection?.length === 1 && promotedSelection[0] === documentIdentity,
		"the promoted live selection is EXACTLY the chosen Document's native identity (the staged selection became the live links)",
	).toBe(true);

	// The shared Document target keeps its identity through the promotion —
	// the same authoritative record its native read still resolves, never a
	// duplicate (SC-002 boundary; the selection identity above is the one it
	// exposed before staging).
	const documentAfter = nativeItemOf(
		await readEntry(admin, DOCUMENTS_COLLECTION, document.entryId!),
	);
	expect(
		documentAfter?.translationGroup,
		"the selected Document's native identity is unchanged after the promotion",
	).toBe(documentIdentity);
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
		(
			await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
				data: { title: pendingTitle },
			})
		).ok,
		"staging the pending content draft must succeed",
	).toBe(true);
	const revisionsBeforeMetadata = revisionsOf(
		await listRevisions(admin, NEWS_COLLECTION, entry.entryId!),
	).total;

	// Three separate current-state metadata writes while the content draft
	// is pending: taxonomy assignment, SEO metadata, byline attribution.
	// None of these is a DRAFT_ONLY key, so none stages a content revision
	// and none publishes the pending draft. The SEO write follows the active
	// native schema: on a collection without the SEO opt-in it is the native
	// VALIDATION_ERROR refusal, which lands nothing.
	const newsHasSeo = seoEnabled.get(NEWS_COLLECTION) === true;
	const termWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		taxonomies: { [TOPIC_TAXONOMY]: [termSlug] },
	});
	expect(
		termWrite.ok,
		`the taxonomy assignment write must succeed (${nativeRefusalOf(termWrite)})`,
	).toBe(true);
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} seo title`;
	const seoWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		seo: { title: seoTitle },
	});
	if (newsHasSeo) {
		expect(seoWrite.ok, `the SEO metadata write must succeed (${nativeRefusalOf(seoWrite)})`).toBe(
			true,
		);
	} else {
		expect(seoWrite.status, "SEO is not enabled on news: the native validation refusal").toBe(400);
		expect(
			nativeErrorOf(seoWrite)?.code,
			"the refusal carries the native VALIDATION_ERROR code",
		).toBe("VALIDATION_ERROR");
	}
	const bylineWrite = await contentPut(admin, NEWS_COLLECTION, entry.entryId!, {
		bylines: [{ bylineId, roleLabel: "Written by" }],
	});
	expect(
		bylineWrite.ok,
		`the byline attribution write must succeed (${nativeRefusalOf(bylineWrite)})`,
	).toBe(true);

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
	if (newsHasSeo) {
		expect(seo?.title, "the SEO metadata is current state immediately").toBe(seoTitle);
	} else {
		expect(seo?.title, "the refused SEO write left no SEO metadata").toBeUndefined();
	}
	// Byline: the current item carries the explicit byline attribution.
	const bylinesRaw = current?.bylines;
	const bylines = Array.isArray(bylinesRaw) ? (bylinesRaw as Array<Record<string, unknown>>) : [];
	const assignedByline = bylines.find(
		(credit) => (credit.byline as Record<string, unknown> | undefined)?.id === bylineId,
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

test("SEO boundary: a collection without SEO enabled refuses SEO writes truthfully and leaves all state untouched", async () => {
	gatePersonnel();
	test.skip(
		seoEnabled.get(PERSONNEL_COLLECTION) === true,
		"the active personnel schema enables SEO, so it cannot exercise the SEO-disabled boundary",
	);

	// The complement of the metadata test above (which exercises the
	// current-state SEO path on `news` when its schema opts in to SEO): the
	// same native write against a collection whose schema has SEO DISABLED is
	// a validation refusal, never a partial write. Verified pinned gate: src/api/handlers/content.ts:1202
	// (VALIDATION_ERROR "Collection … does not have SEO enabled") backed by
	// plugins/context.ts assertSeoEnabled — the refusal precedes every data,
	// taxonomy and reference effect.
	const entry = await createSyntheticEntry(admin, PERSONNEL_COLLECTION, {
		data: { title: uniqueTitle("seo-disabled") },
	});
	expect(entry.result.ok, "the SEO-boundary fixture must save").toBe(true);
	expect(
		(await publishEntry(admin, PERSONNEL_COLLECTION, entry.entryId!)).ok,
		"the SEO-boundary fixture must publish",
	).toBe(true);

	const revisionsBefore = revisionsOf(
		await listRevisions(admin, PERSONNEL_COLLECTION, entry.entryId!),
	).total;
	const refused = await contentPut(admin, PERSONNEL_COLLECTION, entry.entryId!, {
		seo: { title: `${SYNTHETIC_FIXTURE_MARK} must never land` },
	});
	expect(refused.ok, "the SEO write on a non-SEO collection is refused").toBe(false);
	expect(refused.status, "the refusal is the native validation failure").toBe(400);
	expect(nativeErrorOf(refused)?.code, "the refusal carries the native VALIDATION_ERROR code").toBe(
		"VALIDATION_ERROR",
	);

	// Nothing landed anywhere: no content revision, no live-data change, and
	// the entry's current state is byte-for-byte its pre-refusal state.
	expect(
		revisionsOf(await listRevisions(admin, PERSONNEL_COLLECTION, entry.entryId!)).total,
		"the refused SEO write creates no content revision",
	).toBe(revisionsBefore);
	const current = nativeItemOf(await readEntry(admin, PERSONNEL_COLLECTION, entry.entryId!));
	expect(
		String(dataOfItem(current).title ?? "").startsWith(`${SYNTHETIC_FIXTURE_MARK} seo-disabled`),
		"the live data is untouched: the entry keeps its original fixture title",
	).toBe(true);
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
	const listing = revisionsOf(await listRevisions(admin, DOCUMENTS_COLLECTION, document.entryId!));
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
		// Verified pinned native behavior (src/astro/middleware/auth.ts:79,702):
		// an anonymous API request is refused by the AUTHENTICATION layer as
		// 401 NOT_AUTHENTICATED — distinct from the authenticated-but-
		// insufficient-permission family (403 FORBIDDEN via authorize.ts
		// requirePerm/requireOwnerPerm) covered by the T019 role controls.
		expect(
			error?.error?.code,
			`${label}: the refusal carries its native authentication-layer code`,
		).toBe("NOT_AUTHENTICATED");
	}
});

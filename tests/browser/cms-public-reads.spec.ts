// T021 — focused native public-read checks for Feature 002 US6/FR-020: the
// native public query helpers (getEmDashCollection / getEmDashEntry /
// getEmDashReferences) read PUBLISHED content only inside the authentic
// Astro/EmDash request context of the ONE existing persistent development
// server (origin http://127.0.0.1:4322); a native signed preview token for
// one entry serves that entry's pending draft and nothing else; drafts,
// trashed and unpublished targets are omitted without blocking the parent;
// optional omissions stay absent; missing files degrade to a safe
// unavailable state, never a false download success; and errors, not-found
// and empty results stay truthful — with no privileged/draft fallback ever.
// Test support in tests/browser/ only: no application, schema, seed,
// dependency, infrastructure, or production change is made here, and NO
// runtime execution is claimed by authoring this file — the T022 serial
// join owns actually running these checks, and only after the reviewed
// source/config transition installs the dev-only fixture route on the
// persistent server.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T021 ("Tests exercise native
//   getEmDashCollection / getEmDashEntry / getEmDashReferences against the
//   existing persistent development server (origin http://127.0.0.1:4322)
//   and its native Astro request context: published-only reads, authorized
//   signed preview vs unauthenticated query parameters, draft/trashed/
//   unavailable linked targets, optional omissions, missing files,
//   reference hydration/identity/pagination and truthful error/not-found
//   states without privileged fallback") and the "T021 execution and
//   single-runtime isolation" block consumed by T022 (the coordinator
//   orchestrates the pinned Playwright command with
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322; a missing dev-only SSR
//   fixture route is a prerequisite HOLD, never authorization for another
//   server; runtime fixture creation/cleanup happens only in T022)
// - specs/002-cms-content-model/contracts/public-read.md — "Native Reads"
//   (server-side consumers use the three native helpers; ordinary public
//   request context reads published content and live selections; authorized
//   signed preview/edit context may read pending data/selections;
//   unauthenticated query parameters alone do not grant preview;
//   privileged ctx.content.get and administrative REST snapshots are not
//   anonymous public read APIs), "Shared Source and Missing Targets"
//   (unpublished/trashed/unavailable linked content is omitted by the
//   public read path without falling back to a draft or privileged
//   snapshot; missing files produce a safe unavailable state, not an
//   unverified successful download; published status is a visibility
//   boundary, not an editorial-completeness certificate; relation hydration
//   is opt-in; native pagination/error/not-found outcomes are honored) and
//   "Verification Boundary" (test-harness consumers of the one existing
//   persistent development server; HOLD rather than bypass)
// - specs/002-cms-content-model/spec.md — US6 acceptance scenario 1
//   (anonymous reading or unauthorized preview never exposes a saved
//   draft), FR-020 (public reads exclude drafts/unpublished content;
//   preview requires authorization; an unauthenticated query parameter MUST
//   NOT expose drafts; unavailable optional linked content is omitted
//   without blocking the parent), FR-026/SC-005/SC-006 (truthful outcomes)
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes" (POST …/preview-url is the native authorized
//   signed-preview flow, not an unauthenticated query parameter) and the
//   availability boundary ("A valid selected reference/file does not
//   guarantee published target, immutable bytes, future availability or
//   removal veto. D-REF remains deferred. Public reads follow published-only
//   safety.")
// - specs/002-cms-content-model/evidence/T018-us2-reuse.md — the applied
//   live schema standing (all eight seed collections active with their
//   reference bindings) these checks gate on
// - docs/website-modernization-docs/current/10-system-blueprint.md §9
//   (Astro SSR uses the EmDash query functions directly; draft preview uses
//   EmDash's signed preview flow)
// - AGENTS.md "Single Persistent Development Runtime" (all authorized
//   runtime tests target the existing shared development application at
//   http://127.0.0.1:4322; never a second server; tests may use the existing
//   scoped development credential through the approved mode-0600 loader;
//   never re-run setup/dev-bypass, rotate credentials or impersonate roles)
// - tests/browser/cms.helpers.ts — the accepted T002/T013 native request/
//   fixture helpers this file consumes UNCHANGED (loadDevAccessToken for
//   both the development PAT and the coordinated route-access token — both
//   mode-0600 controller-format { token } JSON; createPatActor with live
//   identity verification; createSyntheticEntry/uploadSyntheticMedia with
//   owned-fixture registration; publish/unpublish/trash/restore and
//   readEntry; cleanupOwnedFixtures with trash-aware reconciliation)
// - tests/browser/cms-lifecycle.spec.ts (accepted T019) and
//   cms-revisions.spec.ts (accepted T020) — the patterns this file follows:
//   schema-readiness gating, the unauthenticated authorization control,
//   failure-safe teardown, and the runner-configured origin
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// checked first through Context7 (/withastro/docs for Playwright file-level
// conditional skip semantics — via the pinned
// node_modules/playwright/types/test.d.ts skip(condition, description)
// declarations — and the Astro integration reference for injectRoute), then
// controlled by the PINNED FIRST-PARTY PACKAGE SOURCE: emdash@1.1.0 (npm
// tarball byte-equal to package-lock.json, the same integrity the
// T002/T003/T007/T014/T019/T020 files independently verified), inspected at:
// - getEmDashCollection(type, filter?) → { entries, error?, cacheHint,
//   nextCursor?, hasMore? } (src/query.ts:523); ContentEntry = { id: slug,
//   data, references?, edit }; entries hydrate bylines/taxonomies and strip
//   revision pointers for public contexts. The loader DEFAULTS collection
//   reads to published rows (src/loader.ts:1545 `filter?.status || "published"`),
//   so even with a valid preview token in request context a collection list
//   stays published-only — asserted below, not assumed away
// - getEmDashEntry(type, id, { references? }) → { entry | null, error?,
//   isPreview, fallbackLocale?, cacheHint } (src/query.ts:995,
//   resolveEmDashEntry :1136+). Outside a matching preview/edit context it
//   returns only VISIBLE (published) entries — entry:null with no error for
//   not-found/not-visible. With a valid preview token for collection+entry
//   it serves the pending draft revision (isPreview true). A validly signed
//   token for a DIFFERENT entry of the same collection serves that target
//   published-only (isPreview false) or null — never the other entry's
//   draft; a token for a different collection gives no preview at all
// - getEmDashReferences(type, id, field, { limit?, cursor?, locale? }) →
//   { entries, nextCursor?, error?, cacheHint? } (src/query.ts:1391):
//   unknown field or entry → an EMPTY page, not an error; an unpublished
//   anchor without a matching preview → empty; reference pages contain only
//   published children outside a matching preview (serveDrafts decides
//   "whether an unpublished target resolves at all")
// - preview flow: POST /_emdash/api/content/{collection}/{id}/preview-url
//   (permission content:read_drafts; body { expiresIn?: "1s".."2w"|seconds,
//   pathPattern? } → data { url, expiresAt }) signs
//   base64url(payload).base64url(HMAC), payload { cid: "collection:id",
//   exp, iat } (src/astro/routes/api/content/[collection]/[id]/preview-url.ts;
//   src/preview/tokens.ts). The middleware verifies `?_preview=` on EVERY
//   request and establishes the request context only for a valid,
//   unexpired token (src/astro/middleware/request-context.ts:263–295);
//   invalid/malformed/expired tokens leave the request a plain anonymous
//   public read. Preview responses are served `private, no-store` by the
//   native middleware; this fixture keeps every response no-store
// - the `_edit` query parameter is only meaningful in `toolbar: "client"`
//   mode (request-context.ts: `hasEditParam = toolbarMode === "client" &&
//   url.searchParams.has(EDIT_PARAM)`); edit mode additionally requires the
//   emdash-edit-mode cookie AND an authenticated editor session, so an
//   anonymous `_edit` parameter grants nothing here
//
// Boundaries and non-claims (tasks.md T021; Constitution v3.0.0 II–V):
// - authoring + static/discovery verification only: no scenario below runs
//   at authoring time; discovery (`playwright --list`) performs no native
//   calls and reads no credentials (the module-level gate below reads one
//   environment variable; hooks run only at execution)
// - the suite executes ONLY through its coordinator
//   (node tests/browser/run-cms-public-reads.mjs), which pins
//   PLAYWRIGHT_BASE_URL to the persistent origin and sets the explicit
//   opt-in. Ordinary `npm run test:browser` lists this file but SKIPS every
//   test in it at collection time with the prerequisite named, and the
//   beforeAll returns before loading any credential unless the coordinator
//   opt-in is present
// - the SSR evidence comes from the dev-only fixture route
//   /__feature002/public-reads (injected only in a verified dev context by
//   tests/browser/fixtures/cms-public-reads.integration.mjs), which runs
//   the native helpers inside the authentic request context. Privileged
//   ctx.content.get and Admin REST snapshots are never used as public
//   evidence (one anonymous Admin-REST control below demonstrates the
//   refusal boundary instead). The route is access-token gated, fails
//   closed before any data read, and is bounded to the seed collections
//   and reference fields; its access token travels in a header, never a
//   URL, log or assertion message. If the fixture route is absent or
//   reports an unexpected identity, beforeAll fails loudly with the HOLD
//   prerequisite named — never a fallback, never a second server
// - signed preview URLs are obtained ONLY through the native preview-url
//   API with the development credential, for entries this run owns, with
//   the fixture route as the per-call pathPattern; the short-lived token is
//   the only secret-shaped URL value the flow produces and it is never
//   logged or echoed into evidence (redacted-path helpers below)
// - no Admin PAT or editor cookie is ever attached to an anonymous SSR
//   request: every fixture-route fetch sends only the route access header
// - no privileged/draft fallback, false successful download, atomic
//   metadata/history/byte-retention or D-ITA/D-REF enforcement claim is
//   made anywhere below: a missing file is observed as retained selection
//   identity plus a non-success fetch, with availability/retention
//   explicitly NOT guaranteed
// - fixtures are clearly-marked synthetic public-publishable data; entry
//   ids, `_rev` values and media ids come from native responses only.
//   Fixture-creation intent is retained in a coordinator-owned manifest
//   BEFORE creation and reconciled on every exit path, so an interrupted
//   worker leaves recoverable ownership records instead of silently
//   discarding them. Failure-safe owned-fixture cleanup runs per test
//   (afterEach) plus an afterAll safety net; unresolved fixtures stay
//   registered and are reported, never hidden. The shared app, database,
//   media volumes, credentials, stable source and controller are never
//   test-owned resources

import { expect, test } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	DEFAULT_DEVELOPMENT_ORIGIN,
	deleteMedia,
	loadDevAccessToken,
	nativeItemOf,
	NATIVE_ROLES,
	publishEntry,
	restoreEntry,
	trashEntry,
	unpublishEntry,
	updateEntry,
	uploadSyntheticMedia,
	SYNTHETIC_FIXTURE_MARK,
	type CmsActor,
} from "./cms.helpers";
import {
	T021_FIXTURE_ID,
	T021_FIXTURE_VERSION,
	T021_ROUTE_ACCESS_HEADER,
	T021_ROUTE_PATTERN,
} from "./fixtures/cms-public-reads.integration.mjs";

// ---------------------------------------------------------------------------
// Single-runtime opt-in gate (collection-time only, side-effect free)
// ---------------------------------------------------------------------------

/**
 * Environment variable the single-runtime coordinator sets to "1" when it
 * invokes this file (tests/browser/run-cms-public-reads.mjs). Read once at
 * collection time through the ambient Node process — synchronously and
 * without any dynamic import, so Playwright `--list` discovery stays free of
 * side effects and ordinary `npm run test:browser` never executes this
 * runtime suite or loads any credential.
 */
const COORDINATOR_OPT_IN_ENV = "SONGHEALTH_T021_COORDINATOR";

const ambientNodeProcess = (
	globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
).process;
const coordinatorOptIn = ambientNodeProcess?.env?.[COORDINATOR_OPT_IN_ENV] === "1";

test.skip(
	!coordinatorOptIn,
	`T021 runs only through its single-runtime coordinator (node tests/browser/run-cms-public-reads.mjs against the persistent origin); set ${COORDINATOR_OPT_IN_ENV}=1 only there — ordinary npm run test:browser never executes this runtime suite or reads its credentials`,
);

// ---------------------------------------------------------------------------
// Collections, prerequisite configuration, fixture-route contract
// ---------------------------------------------------------------------------

/**
 * The `pages` collection (required semantic title; optional `documents`
 * reference binding) carries the published-only, live-versus-pending and
 * reference-identity fixtures: any refusal can only be about visibility or
 * state, never completeness.
 */
const PAGES_COLLECTION = "pages";

/** The `documents` collection (required title + required native `file`). */
const DOCUMENTS_COLLECTION = "documents";

/**
 * The `health_reports` collection: its required `report_document` reference
 * is the save-time requiredness contrast — publication does NOT guarantee
 * the target stays available (D-REF stays deferred).
 */
const HEALTH_REPORTS_COLLECTION = "health_reports";

/**
 * The ONE existing persistent development origin (AGENTS.md; quickstart
 * "Prerequisites and Environment"; tasks.md T021). This suite refuses any
 * other origin: an occupied shared origin is its intended state, and no port
 * fallback or substitute server is ever acceptable evidence.
 */
const PERSISTENT_DEVELOPMENT_ORIGIN = "http://127.0.0.1:4322";

/**
 * Mode-0600 controller-format JSON ({ token }) holding the CLIENT copy of
 * the fixture route access token. It is provisioned together with the
 * server-side SONGHEALTH_T021_ROUTE_TOKEN input by the separately
 * authorized source/config maintenance; a missing file is a prerequisite
 * failure (HOLD), never a reason to bypass the route boundary.
 */
const ROUTE_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_T021_ROUTE_ACCESS";

/**
 * Coordinator-owned JSONL file retaining fixture-creation intent for this
 * worker (see the manifest helpers below). Absent when this file runs
 * outside the coordinator.
 */
const OWNERSHIP_MANIFEST_ENV = "SONGHEALTH_T021_OWNERSHIP_MANIFEST";

/** The one clearly synthetic unique title (never real editorial data). */
function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** The runner-configured origin, mirroring playwright.config.ts exactly. */
function configuredOrigin(): string {
	return ambientNodeProcess?.env?.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
}

// ---------------------------------------------------------------------------
// Readiness state, worker scope, and the fixture-route client
// ---------------------------------------------------------------------------

/** One native schema field as the collection read returns it. */
interface SchemaField {
	slug?: unknown;
	type?: unknown;
	required?: unknown;
}

/**
 * Readiness for an exercised collection, decided once per worker in
 * beforeAll from the live native schema read (the accepted T014/T019/T020
 * gating pattern): `missing` SKIPS explicitly; `misconfigured` FAILS loudly.
 */
type CollectionReadiness =
	| { outcome: "ready" }
	| { outcome: "missing" }
	| { outcome: "misconfigured"; detail: string };

/** The development-credential Administrator fixture (preparation side). */
let admin: CmsActor;

/** The coordinated route access token (client copy; in memory only). */
let routeAccessToken: string;

/** Readiness of the exercised collections; set by beforeAll only. */
let pagesReadiness: CollectionReadiness = { outcome: "missing" };
let documentsReadiness: CollectionReadiness = { outcome: "missing" };
let healthReportsReadiness: CollectionReadiness = { outcome: "missing" };

/** Truthful schema gate (T014 gateCollection shape). */
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
	gateCollection(pagesReadiness, PAGES_COLLECTION, "the public-read fixtures");
}

function gateDocuments(): void {
	gateCollection(documentsReadiness, DOCUMENTS_COLLECTION, "the file/reference fixtures");
}

function gateHealthReports(): void {
	gateCollection(
		healthReportsReadiness,
		HEALTH_REPORTS_COLLECTION,
		"the required-reference availability fixtures",
	);
}

/** One reference page as the fixture route returns it. */
interface RouteReferencePage {
	entries?: RouteEntry[];
	nextCursor?: string;
}

/** One entry of a fixture-route collection page. */
interface RouteEntry {
	id?: unknown;
	data?: Record<string, unknown>;
	references?: Record<string, RouteReferencePage>;
}

/** The parsed JSON body of one fixture-route response. */
interface RouteBody {
	error?: string | { name?: string };
	entries?: RouteEntry[];
	entry?: RouteEntry | null;
	isPreview?: boolean;
	nextCursor?: string;
	hasMore?: boolean;
	fixtureId?: string;
	fixtureVersion?: number;
}

/**
 * Perform ONE anonymous fixture-route GET: only the route access header is
 * ever attached (no Admin PAT, no editor cookies), `_preview` — when the
 * caller supplies one — travels exactly as the native signed flow delivers
 * it, redirects are refused, and neither the token nor a preview URL is ever
 * echoed into an assertion message (the path-only redaction helpers below).
 */
async function fetchFixtureRoute(
	searchParams: Record<string, string>,
	options: { previewToken?: string } = {},
): Promise<{ status: number; body: RouteBody; cacheControl: string }> {
	const url = new URL(T021_ROUTE_PATTERN, PERSISTENT_DEVELOPMENT_ORIGIN);
	for (const [key, value] of Object.entries(searchParams)) {
		url.searchParams.set(key, value);
	}
	if (options.previewToken !== undefined) {
		url.searchParams.set("_preview", options.previewToken);
	}
	const response = await fetch(url, {
		method: "GET",
		headers: { [T021_ROUTE_ACCESS_HEADER]: routeAccessToken },
		redirect: "error",
	});
	let body: RouteBody;
	try {
		body = (await response.json()) as RouteBody;
	} catch {
		body = { error: "NON_JSON_BODY" };
	}
	return {
		status: response.status,
		body,
		cacheControl: response.headers.get("cache-control") ?? "",
	};
}

/** The fixture path with any query string removed (evidence-safe label). */
function redactPreviewUrl(url: string): string {
	return new URL(url, PERSISTENT_DEVELOPMENT_ORIGIN).pathname;
}

/**
 * Obtain one native signed preview URL through the supported native API
 * (POST …/preview-url, permission content:read_drafts) for an entry this
 * run owns, with the fixture route as the per-call pathPattern. Returns
 * { previewToken, expiresAt } — the token stays in memory and out of every
 * report; redactPreviewUrl describes the flow in evidence instead.
 */
async function mintPreviewToken(
	collection: string,
	entryId: string,
	expiresIn: string,
): Promise<{ previewToken: string; expiresAt: number }> {
	const result = await cmsRequest(
		admin,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(entryId)}/preview-url`,
		{
			method: "POST",
			body: { pathPattern: T021_ROUTE_PATTERN, expiresIn },
		},
	);
	const data = result.body as { data?: { url?: string; expiresAt?: number } };
	const url = data?.data?.url;
	expect(
		typeof url === "string" && url.length > 0,
		"the native preview-url API must return a signed preview url for an owned fixture entry",
	).toBe(true);
	expect(
		typeof data?.data?.expiresAt === "number",
		"the native preview-url API must return the token expiry",
	).toBe(true);
	const previewToken = new URL(url as string, PERSISTENT_DEVELOPMENT_ORIGIN).searchParams.get(
		"_preview",
	);
	expect(
		typeof previewToken === "string" && previewToken.length > 0,
		`the native preview url at ${redactPreviewUrl(url as string)} must carry the signed _preview token`,
	).toBe(true);
	return { previewToken: previewToken as string, expiresAt: data.data!.expiresAt! };
}

/**
 * Walk the published entries of one collection through the fixture route's
 * bounded pages (limit 100, cursor-pass-through), collecting entry ids for
 * presence/absence checks. Truthful about errors: a native error result or
 * a malformed page stops the walk and reports it instead of pretending the
 * listing was exhausted.
 */
async function collectPublishedIds(collection: string, maxPages = 25): Promise<string[]> {
	const ids: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < maxPages; page += 1) {
		const response = await fetchFixtureRoute({
			case: "collection",
			collection,
			limit: "100",
			...(cursor !== undefined ? { cursor } : {}),
		});
		expect(
			response.status,
			`the fixture-route collection case for ${collection} must succeed`,
		).toBe(200);
		expect(
			response.body.error,
			`the ${collection} collection read must not report a native error`,
		).toBeUndefined();
		const entries = response.body.entries ?? [];
		for (const entry of entries) {
			if (typeof entry.id === "string") {
				ids.push(entry.id);
			}
		}
		if (response.body.nextCursor === undefined) {
			return ids;
		}
		cursor = response.body.nextCursor;
	}
	throw new Error(
		`the published ${collection} listing did not terminate within ${maxPages} bounded pages; refusing to claim absence without an exhausted listing`,
	);
}

// ---------------------------------------------------------------------------
// Coordinator-owned fixture-creation manifest (intent retained BEFORE the
// native call, reconciled on every exit path)
// ---------------------------------------------------------------------------

/** Append one ownership record to the coordinator-owned manifest, if any. */
async function manifestRecord(
	record: Record<string, unknown>,
): Promise<void> {
	const path = ambientNodeProcess?.env?.[OWNERSHIP_MANIFEST_ENV];
	if (path === undefined || path.trim().length === 0) {
		return;
	}
	const fsSpecifier = "node:fs/promises";
	const fsPromises = (await import(fsSpecifier)) as unknown as {
		appendFile: (p: string, data: string, encoding: "utf8") => Promise<void>;
	};
	await fsPromises.appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
}

/**
 * Remove the manifest after a verified residue-free worker cleanup, so its
 * continued existence after a run always means recoverable owned fixtures.
 */
async function manifestRemove(): Promise<void> {
	const path = ambientNodeProcess?.env?.[OWNERSHIP_MANIFEST_ENV];
	if (path === undefined || path.trim().length === 0) {
		return;
	}
	const fsSpecifier = "node:fs/promises";
	const fsPromises = (await import(fsSpecifier)) as unknown as {
		unlink: (p: string) => Promise<void>;
	};
	try {
		await fsPromises.unlink(path);
	} catch {
		// Already absent — nothing this worker still owns.
	}
}

/** The synthetic slug a fixture entry will use (known BEFORE creation). */
function nextSyntheticSlug(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK}-${kind}-${crypto.randomUUID().slice(0, 13)}`;
}

/**
 * Create one OWNED synthetic page fixture: the creation intent (collection +
 * fresh unique slug) is retained in the manifest BEFORE the native call, and
 * the native-returned identity after it — an uncertain create stays
 * recoverable and a committed-but-unacknowledged one stays registered for
 * teardown.
 */
async function createOwnedPage(options: {
	kind: string;
	references?: Record<string, string[]>;
}): Promise<{ entryId: string; slug: string; title: string }> {
	const title = uniqueTitle(options.kind);
	const slug = nextSyntheticSlug(options.kind);
	await manifestRecord({ phase: "intent", kind: "entry", collection: PAGES_COLLECTION, slug });
	const created = await createSyntheticEntry(admin, PAGES_COLLECTION, {
		data: { title },
		slug,
		...(options.references !== undefined ? { references: options.references } : {}),
	});
	expect(created.result.ok, "the synthetic page fixture must save").toBe(true);
	expect(created.entryId, "the page fixture id must come from the native response").toBeTruthy();
	await manifestRecord({
		phase: "created",
		kind: "entry",
		collection: PAGES_COLLECTION,
		id: created.entryId,
		slug,
	});
	return { entryId: created.entryId!, slug, title };
}

/**
 * Create one OWNED synthetic Document fixture around a fresh owned media
 * upload (the same intent-retention discipline as createOwnedPage).
 */
async function createOwnedDocument(kind: string): Promise<{
	entryId: string;
	slug: string;
	title: string;
	mediaId: string;
}> {
	const upload = await uploadSyntheticMedia(admin);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	expect(upload.mediaId, "a media id must be returned and registered for owned cleanup").toBeTruthy();
	await manifestRecord({ phase: "intent", kind: "media", id: upload.mediaId });
	const title = uniqueTitle(kind);
	const slug = nextSyntheticSlug(kind);
	await manifestRecord({ phase: "intent", kind: "entry", collection: DOCUMENTS_COLLECTION, slug });
	const created = await createSyntheticEntry(admin, DOCUMENTS_COLLECTION, {
		data: { title, file: { id: upload.mediaId! } },
		slug,
	});
	expect(created.result.ok, "the synthetic Document fixture must save").toBe(true);
	await manifestRecord({
		phase: "created",
		kind: "entry",
		collection: DOCUMENTS_COLLECTION,
		id: created.entryId,
		slug,
	});
	return { entryId: created.entryId!, slug, title, mediaId: upload.mediaId! };
}

// ---------------------------------------------------------------------------
// Worker bootstrap and failure-safe owned-fixture cleanup
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
	if (!coordinatorOptIn) {
		// Defensive: without the coordinator opt-in this file is skipped at
		// collection time; never load credentials outside the coordinator.
		return;
	}
	const origin = configuredOrigin();
	expect(
		origin,
		"this suite runs only against the ONE existing persistent development origin (unexpected origin is a prerequisite failure, never a port fallback)",
	).toBe(PERSISTENT_DEVELOPMENT_ORIGIN);

	// Development native access through the pre-existing development
	// credential (T013 adaptation; never the dev-bypass bootstrap). This
	// hook creates no owned fixtures; discovery performs no native calls.
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	expect(
		admin.email,
		"the development credential must belong to the intended dev@emdash.local fixture account",
	).toBe("dev@emdash.local");

	// The coordinated route access token (client copy of the server-only
	// capability input; provisioned by the separately authorized maintenance).
	const routeAccessPath = ambientNodeProcess?.env?.[ROUTE_ACCESS_CREDENTIAL_ENV];
	routeAccessToken = await loadDevAccessToken(routeAccessPath);

	// Fixture-route prerequisite: the dev-only SSR fixture must be installed
	// on THIS server and report the expected identity. A missing route or an
	// unexpected identity is a loud prerequisite failure (HOLD) — the checks
	// below never substitute a second server, a privileged read, or a bypass.
	const probe = await fetchFixtureRoute({ case: "probe" });
	expect(
		probe.status,
		`the dev-only fixture route ${T021_ROUTE_PATTERN} must be installed on the persistent server (404 = integration not installed; 503 = route access capability unprovisioned; both are HOLD prerequisites, never bypassed)`,
	).toBe(200);
	expect(probe.body.fixtureId, "the fixture route must report the expected identity").toBe(
		T021_FIXTURE_ID,
	);
	expect(probe.body.fixtureVersion, "the fixture route must report the expected version").toBe(
		T021_FIXTURE_VERSION,
	);
	expect(
		probe.cacheControl,
		"every fixture-route response must be marked no-store",
	).toContain("no-store");

	// One live schema read per exercised collection decides readiness. The
	// definition facts relied on below: a required semantic title everywhere,
	// the required native `file` on documents, and the required
	// `report_document` reference binding on health_reports.
	const readinessOf = async (
		collection: string,
		extra: (bySlug: Map<string, SchemaField>) => string[],
	): Promise<CollectionReadiness> => {
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
			if (typeof field.slug === "string") {
				bySlug.set(field.slug, field);
			}
		}
		const problems: string[] = [];
		const title = bySlug.get("title");
		if (title?.type !== "string" || title.required !== true) {
			problems.push("title must be a required native string field");
		}
		problems.push(...extra(bySlug));
		return problems.length > 0
			? { outcome: "misconfigured", detail: problems.join("; ") }
			: { outcome: "ready" };
	};
	pagesReadiness = await readinessOf(PAGES_COLLECTION, (bySlug) => {
		const problems: string[] = [];
		if (bySlug.get("documents")?.type !== "reference") {
			problems.push("pages.documents must be a native reference field");
		}
		return problems;
	});
	documentsReadiness = await readinessOf(DOCUMENTS_COLLECTION, (bySlug) => {
		const problems: string[] = [];
		if (bySlug.get("file")?.required !== true) {
			problems.push("documents.file must be a required native field");
		}
		return problems;
	});
	healthReportsReadiness = await readinessOf(HEALTH_REPORTS_COLLECTION, (bySlug) => {
		const problems: string[] = [];
		if (bySlug.get("report_document")?.type !== "reference") {
			problems.push("health_reports.report_document must be a native reference field");
		}
		return problems;
	});
});

/** Owned-fixture cleanup for the acting actors; never throws past a failure. */
async function cleanupOwned(actor: CmsActor | undefined): Promise<string[]> {
	if (actor === undefined) {
		return [];
	}
	const report = await cleanupOwnedFixtures(actor);
	const failures: string[] = [];
	for (const entry of report.entries) {
		if (!entry.resolved) {
			failures.push(
				`owned entry ${entry.collection}/${entry.id} unresolved (trashed=${entry.trashed}, permanentlyDeleted=${entry.permanentlyDeleted}${entry.refusal === undefined ? "" : `; refusal ${entry.refusal}`})`,
			);
		}
	}
	for (const media of report.media) {
		if (!media.resolved) {
			failures.push(
				`owned media ${media.id} unresolved${media.refusal === undefined ? "" : `; refusal ${media.refusal}`}`,
			);
		}
	}
	return failures;
}

test.afterEach(async () => {
	// Each cleanup runs INDEPENDENTLY; combined failures are reported only
	// after all attempts, and unresolved fixtures stay registered (the
	// helpers' reconciliation contract) so a later cleanup can retry them.
	const failures = await cleanupOwned(admin);
	expect(
		failures,
		"owned synthetic fixtures must be reconciled after each case (unresolved fixtures stay registered for a later retry and are reported, never hidden)",
	).toEqual([]);
	await manifestRemove();
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything). Every
	// attempt is still made and reported before failing loudly.
	const failures = await cleanupOwned(admin);
	if (failures.length > 0) {
		await manifestRecord({ phase: "after-all-residual", failures });
		throw new Error(`afterAll reconciliation failures after all attempts: ${failures.join("; ")}`);
	}
	await manifestRemove();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A valid native file value for an uploaded fixture media id. */
function fileValueFor(mediaId: string): { id: string } {
	return { id: mediaId };
}

/** Publish one owned fixture entry (fresh native preconditions inside). */
async function publishOwned(collection: string, entryId: string): Promise<void> {
	const published = await publishEntry(admin, collection, entryId);
	expect(
		published.ok,
		`the owned fixture ${collection}/${entryId} must publish (${published.status})`,
	).toBe(true);
}

// ---------------------------------------------------------------------------
// The checks (authored for the T022 serial runtime join)
// ---------------------------------------------------------------------------

test("fixture route contract: identity probe, no-store, fail-closed access, method and bounded-input refusals", async () => {
	// Identity/readiness (also probed in beforeAll): the route reports the
	// expected fixture identity and keeps every response uncached.
	const probe = await fetchFixtureRoute({ case: "probe" });
	expect(probe.status).toBe(200);
	expect(probe.body.fixtureId).toBe(T021_FIXTURE_ID);
	expect(probe.body.fixtureVersion).toBe(T021_FIXTURE_VERSION);
	expect(probe.cacheControl).toContain("no-store");

	// Fail-closed access BEFORE any data read: no token, and a wrong token,
	// are both refused — Host/Origin headers are never the boundary.
	const anonymous = await fetch(`${new URL(T021_ROUTE_PATTERN, PERSISTENT_DEVELOPMENT_ORIGIN)}`, {
		redirect: "error",
	});
	expect(
		anonymous.status,
		"a request without the route access token must be refused before any data read",
	).toBe(403);
	expect(anonymous.headers.get("cache-control") ?? "").toContain("no-store");
	const wrongToken = await fetch(new URL(T021_ROUTE_PATTERN, PERSISTENT_DEVELOPMENT_ORIGIN), {
		headers: { [T021_ROUTE_ACCESS_HEADER]: `wrong-${crypto.randomUUID()}` },
		redirect: "error",
	});
	expect(wrongToken.status, "a mismatched route access token must be refused").toBe(403);

	// Method and bounded-input refusals (truthful route errors, not native
	// data): non-GET, unknown case, non-allowlisted collection, non-allowlisted
	// reference field, out-of-range limit, and the filter inputs the route
	// must never accept (a draft-status or arbitrary-filter query surface).
	const url = new URL(T021_ROUTE_PATTERN, PERSISTENT_DEVELOPMENT_ORIGIN);
	for (const [label, init, params] of [
		["non-GET method", { method: "POST" }, new URLSearchParams({ case: "probe" })],
	] as const) {
		const response = await fetch(`${url}?${params}`, {
			...init,
			headers: { [T021_ROUTE_ACCESS_HEADER]: routeAccessToken },
			redirect: "error",
		});
		expect(response.status, `${label} must be refused`).toBe(405);
	}
	for (const [label, params] of [
		["unknown case", { case: "dump-everything" }],
		["non-allowlisted collection", { case: "collection", collection: "_emdash" }],
		["draft status filter", { case: "collection", collection: PAGES_COLLECTION, status: "draft" }],
		["where filter", { case: "collection", collection: PAGES_COLLECTION, where: "1=1" }],
		["out-of-range limit", { case: "collection", collection: PAGES_COLLECTION, limit: "1000" }],
		["non-integer limit", { case: "collection", collection: PAGES_COLLECTION, limit: "two" }],
		[
			"non-allowlisted reference field",
			{
				case: "references",
				collection: PAGES_COLLECTION,
				id: "some-slug",
				field: "not-a-bound-field",
			},
		],
		["malformed entry id", { case: "entry", collection: PAGES_COLLECTION, id: "../_emdash/api" }],
	] as [string, Record<string, string>][]) {
		const response = await fetchFixtureRoute(params);
		expect(response.status, `${label} must be refused as a bounded-input error`).toBe(400);
		expect(response.body.error, `${label} refusal carries its error code`).toBeTruthy();
	}
});

test("published-only collection reads: drafts, pending titles, unpublished and trashed entries never appear; published ones do", async () => {
	gatePages();

	const fixture = await createOwnedPage({ kind: "published-only" });
	const slug = fixture.slug;

	// A fresh draft is invisible to the public collection read.
	let published = await collectPublishedIds(PAGES_COLLECTION);
	expect(
		published.includes(slug),
		"a never-published draft must not appear in the public collection read",
	).toBe(false);

	// Once published, the same entry appears — with its LIVE values.
	await publishOwned(PAGES_COLLECTION, fixture.entryId);
	published = await collectPublishedIds(PAGES_COLLECTION);
	expect(
		published.includes(slug),
		"a published entry must appear in the public collection read",
	).toBe(true);
	const listed = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: slug,
	});
	expect(listed.body.entry?.data?.title).toBe(fixture.title);

	// A staged (pending) content edit keeps the LIVE title public.
	const stagedTitle = uniqueTitle("pending-title");
	const staged = await updateEntry(admin, PAGES_COLLECTION, fixture.entryId, {
		data: { title: stagedTitle },
	});
	expect(staged.ok, "the staged edit must save as a pending draft revision").toBe(true);
	const stillLive = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: slug,
	});
	expect(
		stillLive.body.entry?.data?.title,
		"a staged edit must NOT replace the public live title before publication",
	).toBe(fixture.title);
	expect(stillLive.body.isPreview, "an anonymous read is never a preview").toBe(false);

	// Unpublished: excluded again.
	const unpublished = await unpublishEntry(admin, PAGES_COLLECTION, fixture.entryId);
	expect(unpublished.ok, "the owned fixture must unpublish").toBe(true);
	published = await collectPublishedIds(PAGES_COLLECTION);
	expect(
		published.includes(slug),
		"an unpublished entry must not appear in the public collection read",
	).toBe(false);

	// Trashed: also excluded (restore first so the trash transition is the
	// observed one from a published state).
	await publishOwned(PAGES_COLLECTION, fixture.entryId);
	const trashed = await trashEntry(admin, PAGES_COLLECTION, fixture.entryId);
	expect(trashed.ok, "the owned fixture must trash").toBe(true);
	published = await collectPublishedIds(PAGES_COLLECTION);
	expect(
		published.includes(slug),
		"a trashed entry must not appear in the public collection read",
	).toBe(false);
	await restoreEntry(admin, PAGES_COLLECTION, fixture.entryId);
});

test("published entry reads: optional omissions stay absent and never fabricated", async () => {
	gatePages();

	// Only the required semantic title is supplied; every optional value is
	// omitted. Published status is a visibility boundary, not a completeness
	// certificate: the public read must return the entry with its omissions
	// intact — no privileged/draft fallback, no inferred defaults.
	const fixture = await createOwnedPage({ kind: "optional-omissions" });
	await publishOwned(PAGES_COLLECTION, fixture.entryId);

	const read = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: fixture.slug,
	});
	expect(read.status).toBe(200);
	expect(read.body.entry, "the published entry must be readable").not.toBeNull();
	expect(read.body.entry?.id, "the public entry identity is its slug").toBe(fixture.slug);
	expect(read.body.entry?.data?.title).toBe(fixture.title);
	expect(
		read.body.entry?.data?.summary,
		"an omitted optional field must stay absent (no fabricated value)",
	).toBeUndefined();
	expect(
		read.body.entry?.references,
		"references stay absent unless the caller opted in",
	).toBeUndefined();
	expect(read.body.isPreview).toBe(false);

	// A second page referencing nothing reads with the same shape (the
	// empty-selection contrast for the reference cases below).
	const bare = await createOwnedPage({ kind: "no-selection" });
	await publishOwned(PAGES_COLLECTION, bare.entryId);
	const bareRead = await fetchFixtureRoute({
		case: "entry-with-references",
		collection: PAGES_COLLECTION,
		id: bare.slug,
		field: "documents",
	});
	expect(bareRead.status).toBe(200);
	expect(bareRead.body.entry?.references?.documents?.entries ?? []).toEqual([]);
});

test("live versus pending: staged content-data and reference selections stay invisible to public reads until publication", async () => {
	gatePages();
	gateDocuments();

	// Two owned published Documents and a published parent page selecting
	// only the first one.
	const first = await createOwnedDocument("live-pending-a");
	const second = await createOwnedDocument("live-pending-b");
	await publishOwned(DOCUMENTS_COLLECTION, first.entryId);
	await publishOwned(DOCUMENTS_COLLECTION, second.entryId);
	const parent = await createOwnedPage({
		kind: "live-pending-parent",
		references: { documents: [first.entryId] },
	});
	await publishOwned(PAGES_COLLECTION, parent.entryId);

	// Stage BOTH a content-data edit and an added reference selection.
	const stagedTitle = uniqueTitle("staged-parent-title");
	const staged = await updateEntry(admin, PAGES_COLLECTION, parent.entryId, {
		data: { title: stagedTitle },
		references: { documents: [first.entryId, second.entryId] },
	});
	expect(staged.ok, "the staged data/reference edit must save").toBe(true);

	// Public reads keep the LIVE content and the LIVE selection.
	const publicEntry = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: parent.slug,
	});
	expect(publicEntry.body.entry?.data?.title).toBe(parent.title);
	const publicWithRefs = await fetchFixtureRoute({
		case: "entry-with-references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
	});
	const publicIds = (publicWithRefs.body.entry?.references?.documents?.entries ?? []).map(
		(entry: RouteEntry) => entry.id,
	);
	expect(
		publicIds,
		"the public reference read keeps the live selection (one target) while a pending selection exists",
	).toEqual([first.slug]);

	// The authorized signed preview of THIS entry serves the pending draft:
	// staged title and staged selection, isPreview true.
	const { previewToken } = await mintPreviewToken(PAGES_COLLECTION, parent.entryId, "10m");
	const previewEntry = await fetchFixtureRoute(
		{ case: "entry", collection: PAGES_COLLECTION, id: parent.slug },
		{ previewToken },
	);
	expect(previewEntry.body.isPreview, "a matching signed preview must report isPreview").toBe(
		true,
	);
	expect(
		previewEntry.body.entry?.data?.title,
		"a matching signed preview serves the pending draft data",
	).toBe(stagedTitle);
	const previewWithRefs = await fetchFixtureRoute(
		{ case: "entry-with-references", collection: PAGES_COLLECTION, id: parent.slug, field: "documents" },
		{ previewToken },
	);
	const previewIds = (previewWithRefs.body.entry?.references?.documents?.entries ?? []).map(
		(entry: RouteEntry) => entry.id,
	);
	expect(
		previewIds.sort(),
		"a matching signed preview serves the staged reference selection",
	).toEqual([first.slug, second.slug].sort());

	// Even with that valid preview token in request context, the COLLECTION
	// read stays published-only live data (the pinned loader defaults
	// collection reads to published rows; a preview token is not a
	// collection-wide draft grant).
	const collectionUnderPreview = await fetchFixtureRoute(
		{ case: "collection", collection: PAGES_COLLECTION, limit: "100" },
		{ previewToken },
	);
	expect(
		collectionUnderPreview.body.error,
		"the collection read under preview must not error",
	).toBeUndefined();
	const parentUnderPreview = (collectionUnderPreview.body.entries ?? []).find(
		(entry: RouteEntry) => entry.id === parent.slug,
	);
	expect(
		parentUnderPreview?.data?.title,
		"a collection read under a preview token still serves the live published title",
	).toBe(parent.title);

	// Publication promotes exactly what was staged.
	const promoted = await publishEntry(admin, PAGES_COLLECTION, parent.entryId);
	expect(promoted.ok, "publishing the staged changes must succeed").toBe(true);
	const afterPublish = await fetchFixtureRoute({
		case: "entry-with-references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
	});
	expect(afterPublish.body.entry?.data?.title).toBe(stagedTitle);
	const promotedIds = (afterPublish.body.entry?.references?.documents?.entries ?? []).map(
		(entry: RouteEntry) => entry.id,
	);
	expect(promotedIds.sort()).toEqual([first.slug, second.slug].sort());
});

test("native signed preview boundary: absent, malformed, expired, wrong-entry, wrong-collection and untrusted edit parameters never expose drafts", async () => {
	gatePages();
	gateDocuments();

	// Target: a published page with a staged pending edit.
	const target = await createOwnedPage({ kind: "preview-target" });
	await publishOwned(PAGES_COLLECTION, target.entryId);
	const stagedTitle = uniqueTitle("preview-staged");
	const staged = await updateEntry(admin, PAGES_COLLECTION, target.entryId, {
		data: { title: stagedTitle },
	});
	expect(staged.ok).toBe(true);

	// A second entry with its own staged draft: its valid token is the
	// wrong-entry control.
	const other = await createOwnedPage({ kind: "preview-other" });
	await publishOwned(PAGES_COLLECTION, other.entryId);
	const otherStagedTitle = uniqueTitle("preview-other-staged");
	const otherStaged = await updateEntry(admin, PAGES_COLLECTION, other.entryId, {
		data: { title: otherStagedTitle },
	});
	expect(otherStaged.ok).toBe(true);

	// A Document (a DIFFERENT collection) with a valid token: the
	// wrong-collection control.
	const documentFixture = await createOwnedDocument("preview-wrong-collection");
	await publishOwned(DOCUMENTS_COLLECTION, documentFixture.entryId);

	const readTitle = async (previewToken?: string) =>
		fetchFixtureRoute({ case: "entry", collection: PAGES_COLLECTION, id: target.slug }, { previewToken });

	// Absent token: plain anonymous public read.
	const absent = await readTitle();
	expect(absent.body.entry?.data?.title).toBe(target.title);
	expect(absent.body.isPreview).toBe(false);

	// Malformed token: no preview context is established at all.
	const malformed = await readTitle("definitely-not-a-signed-token");
	expect(malformed.body.entry?.data?.title, "a malformed _preview token must not expose the draft").toBe(
		target.title,
	);
	expect(malformed.body.isPreview).toBe(false);

	// Expired token: minted with the native API at the minimum duration,
	// then aged past its expiry — the middleware leaves the request public.
	const expired = await mintPreviewToken(PAGES_COLLECTION, target.entryId, "1s");
	await new Promise((resolve) => setTimeout(resolve, 1500));
	const expiredRead = await readTitle(expired.previewToken);
	expect(
		expiredRead.body.entry?.data?.title,
		"an expired signed token must not expose the draft",
	).toBe(target.title);
	expect(expiredRead.body.isPreview).toBe(false);

	// Wrong entry: a VALID token for another entry of the same collection
	// never serves this entry's draft.
	const wrongEntry = await mintPreviewToken(PAGES_COLLECTION, other.entryId, "10m");
	const wrongEntryRead = await readTitle(wrongEntry.previewToken);
	expect(
		wrongEntryRead.body.entry?.data?.title,
		"a valid token for ANOTHER entry must not expose this entry's draft",
	).toBe(target.title);
	expect(wrongEntryRead.body.isPreview).toBe(false);

	// Wrong collection: a valid token minted for a documents entry gives no
	// pages preview at all.
	const wrongCollection = await mintPreviewToken(DOCUMENTS_COLLECTION, documentFixture.entryId, "10m");
	const wrongCollectionRead = await readTitle(wrongCollection.previewToken);
	expect(
		wrongCollectionRead.body.entry?.data?.title,
		"a valid token for another COLLECTION must not expose this entry's draft",
	).toBe(target.title);
	expect(wrongCollectionRead.body.isPreview).toBe(false);

	// Untrusted `_edit` query parameter: anonymous `_edit` grants nothing
	// (edit mode additionally requires an authenticated editor session).
	const editParam = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: target.slug,
		_edit: "1",
	});
	expect(editParam.body.entry?.data?.title).toBe(target.title);
	expect(editParam.body.isPreview).toBe(false);

	// The same boundary on the standalone references read: a foreign token
	// keeps the published selection; and a draft entry (never published)
	// yields no entry at all rather than its draft.
	const referencesUnderForeignToken = await fetchFixtureRoute(
		{ case: "references", collection: PAGES_COLLECTION, id: target.slug, field: "documents" },
		{ previewToken: wrongEntry.previewToken },
	);
	expect(
		referencesUnderForeignToken.body.error,
		"the references read under a foreign token must not error",
	).toBeUndefined();
	expect(
		Array.isArray(referencesUnderForeignToken.body.entries),
		"the references read under a foreign token returns its (empty) published page",
	).toBe(true);

	const draftOnly = await createOwnedPage({ kind: "preview-draft-only" });
	const draftRead = await fetchFixtureRoute(
		{ case: "entry", collection: PAGES_COLLECTION, id: draftOnly.slug },
		{ previewToken: wrongEntry.previewToken },
	);
	expect(
		draftRead.body.entry,
		"a never-published entry stays invisible even with a valid foreign token",
	).toBeNull();

});

test("draft, trashed and unavailable linked targets are omitted from public reference reads without blocking the parent", async () => {
	gatePages();
	gateDocuments();

	// Three owned published Documents; the parent selects all three while
	// every target is available.
	const available = await createOwnedDocument("target-available");
	const unpublishedTarget = await createOwnedDocument("target-unpublished");
	const trashedTarget = await createOwnedDocument("target-trashed");
	for (const target of [available, unpublishedTarget, trashedTarget]) {
		await publishOwned(DOCUMENTS_COLLECTION, target.entryId);
	}
	const parent = await createOwnedPage({
		kind: "unavailable-targets-parent",
		references: { documents: [available.entryId, unpublishedTarget.entryId, trashedTarget.entryId] },
	});
	await publishOwned(PAGES_COLLECTION, parent.entryId);

	const referenceIds = async (): Promise<string[]> => {
		const read = await fetchFixtureRoute({
			case: "entry-with-references",
			collection: PAGES_COLLECTION,
			id: parent.slug,
			field: "documents",
		});
		expect(read.status).toBe(200);
		const ids: string[] = [];
		for (const entry of read.body.entry?.references?.documents?.entries ?? []) {
			if (typeof entry.id === "string") {
				ids.push(entry.id);
			}
		}
		return ids;
	};

	// All three targets are published: the public selection carries all.
	expect((await referenceIds()).sort()).toEqual(
		[available.slug, unpublishedTarget.slug, trashedTarget.slug].sort(),
	);

	// Unpublish one target: omitted, parent still readable.
	const unpublished = await unpublishEntry(admin, DOCUMENTS_COLLECTION, unpublishedTarget.entryId);
	expect(unpublished.ok).toBe(true);
	expect(await referenceIds()).toEqual([available.slug, trashedTarget.slug]);

	// Trash another: omitted too, parent still readable (restore keeps the
	// entry recoverable for its own teardown).
	const trashed = await trashEntry(admin, DOCUMENTS_COLLECTION, trashedTarget.entryId);
	expect(trashed.ok).toBe(true);
	expect(await referenceIds()).toEqual([available.slug]);

	// The parent's own entry read keeps succeeding (no blocking, no error).
	const parentRead = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: parent.slug,
	});
	expect(parentRead.status).toBe(200);
	expect(parentRead.body.entry?.data?.title).toBe(parent.title);
	await restoreEntry(admin, DOCUMENTS_COLLECTION, trashedTarget.entryId);
});

test("a save-time required reference is not a read-time availability guarantee (D-REF stays deferred)", async () => {
	gatePages();
	gateDocuments();
	gateHealthReports();

	// health_reports requires report_document at save; publication does not
	// freeze or guarantee the target. Unpublish the selected Document and
	// observe the public read: the report stays readable, its reference read
	// omits the unavailable target — no error, no privileged snapshot.
	const documentFixture = await createOwnedDocument("report-target");
	await publishOwned(DOCUMENTS_COLLECTION, documentFixture.entryId);
	const report = await createSyntheticEntry(admin, HEALTH_REPORTS_COLLECTION, {
		data: { title: uniqueTitle("report-missing-target") },
		slug: nextSyntheticSlug("report-missing-target"),
		references: { report_document: [documentFixture.entryId] },
	});
	expect(report.result.ok, "the synthetic health report must save with its required reference").toBe(
		true,
	);
	await manifestRecord({
		phase: "created",
		kind: "entry",
		collection: HEALTH_REPORTS_COLLECTION,
		id: report.entryId,
	});
	await publishOwned(HEALTH_REPORTS_COLLECTION, report.entryId!);
	const reportSlug = (nativeItemOf(report.result)?.slug as string | undefined) ?? "";

	const unpublished = await unpublishEntry(admin, DOCUMENTS_COLLECTION, documentFixture.entryId);
	expect(unpublished.ok).toBe(true);

	const reportRead = await fetchFixtureRoute({
		case: "entry",
		collection: HEALTH_REPORTS_COLLECTION,
		id: reportSlug,
	});
	expect(reportRead.status).toBe(200);
	expect(reportRead.body.entry?.data?.title).toBeDefined();
	const referencesRead = await fetchFixtureRoute({
		case: "references",
		collection: HEALTH_REPORTS_COLLECTION,
		id: reportSlug,
		field: "report_document",
	});
	expect(referencesRead.status).toBe(200);
	expect(
		referencesRead.body.entries,
		"an unavailable required target is omitted from the public reference read",
	).toEqual([]);
	expect(
		referencesRead.body.error,
		"omission is an empty page, never a native error or a fallback snapshot",
	).toBeUndefined();
});

test("reference identity, opt-in hydration and multi-page traversal", async () => {
	gatePages();
	gateDocuments();

	// Three owned published Documents; the editor's selection order is the
	// identity under test.
	const targets: Awaited<ReturnType<typeof createOwnedDocument>>[] = [];
	for (let index = 0; index < 3; index += 1) {
		const target = await createOwnedDocument(`pagination-${index}`);
		await publishOwned(DOCUMENTS_COLLECTION, target.entryId);
		targets.push(target);
	}
	const parent = await createOwnedPage({
		kind: "pagination-parent",
		references: { documents: targets.map((target) => target.entryId) },
	});
	await publishOwned(PAGES_COLLECTION, parent.entryId);

	// Opt-in boundary: a plain entry read carries NO references at all.
	const plain = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: parent.slug,
	});
	expect(plain.body.entry?.references, "unrequested references remain absent").toBeUndefined();

	// Identity: the opted-in first page carries exactly the selected targets,
	// in the editor's chosen order.
	const firstPage = await fetchFixtureRoute({
		case: "entry-with-references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
	});
	const firstIds = (firstPage.body.entry?.references?.documents?.entries ?? []).map(
		(entry: RouteEntry) => entry.id,
	);
	expect(firstIds).toEqual(targets.map((target) => target.slug));

	// The standalone references read agrees on identity.
	const standalone = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
	});
	expect((standalone.body.entries ?? []).map((entry: RouteEntry) => entry.id)).toEqual(
		targets.map((target) => target.slug),
	);

	// Multi-page traversal through the native cursor: limit 2, then the
	// nextCursor page; the union is exactly the selection, pages disjoint.
	const pageOne = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
		limit: "2",
	});
	const pageOneIds = (pageOne.body.entries ?? []).map((entry: RouteEntry) => entry.id);
	expect(pageOneIds).toEqual(targets.slice(0, 2).map((target) => target.slug));
	expect(typeof pageOne.body.nextCursor, "a bounded page that truncates carries a cursor").toBe(
		"string",
	);
	const pageTwo = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: parent.slug,
		field: "documents",
		limit: "2",
		cursor: pageOne.body.nextCursor as string,
	});
	const pageTwoIds = (pageTwo.body.entries ?? []).map((entry: RouteEntry) => entry.id);
	expect(pageTwoIds).toEqual(targets.slice(2).map((target) => target.slug));
	expect(pageTwo.body.nextCursor, "the terminal page carries no cursor").toBeUndefined();
	expect(new Set([...pageOneIds, ...pageTwoIds]).size).toBe(3);

	// Collection-level pagination stays structural (no claim about unrelated
	// real content): bounded pages, disjoint ids, an explicit terminal page.
	const collectionPageOne = await fetchFixtureRoute({
		case: "collection",
		collection: PAGES_COLLECTION,
		limit: "2",
	});
	expect((collectionPageOne.body.entries ?? []).length).toBeLessThanOrEqual(2);
	if (collectionPageOne.body.nextCursor !== undefined) {
		const collectionPageTwo = await fetchFixtureRoute({
			case: "collection",
			collection: PAGES_COLLECTION,
			limit: "2",
			cursor: collectionPageOne.body.nextCursor,
		});
		const pageOneSet = new Set((collectionPageOne.body.entries ?? []).map((entry: RouteEntry) => entry.id));
		for (const entry of collectionPageTwo.body.entries ?? []) {
			expect(
				pageOneSet.has(entry.id as string),
				"keyset pagination pages must be disjoint",
			).toBe(false);
		}
	}
});

test("missing files: a published Document whose media asset was removed reads as safe unavailability, never a false download success", async () => {
	gateDocuments();

	// The owned media asset behind the required file value is deleted after
	// publication. The public read keeps the SELECTION IDENTITY (no byte or
	// availability guarantee exists — D-REF stays deferred) and never
	// fabricates a successful download.
	const fixture = await createOwnedDocument("missing-file");
	await publishOwned(DOCUMENTS_COLLECTION, fixture.entryId);

	const before = await fetchFixtureRoute({
		case: "entry",
		collection: DOCUMENTS_COLLECTION,
		id: fixture.slug,
	});
	const fileBefore = before.body.entry?.data?.file as { id?: unknown; src?: unknown } | undefined;
	expect(fileBefore?.id, "the published file value carries the selected media id").toBe(
		fixture.mediaId,
	);

	// Remove the owned asset (native media removal, own asset).
	const removed = await deleteMedia(admin, fixture.mediaId);
	expect(removed.ok, "the owned media asset must be removable").toBe(true);

	// The Document stays published and readable; its file value keeps the
	// now-dangling selection identity.
	const after = await fetchFixtureRoute({
		case: "entry",
		collection: DOCUMENTS_COLLECTION,
		id: fixture.slug,
	});
	expect(after.status, "the parent Document read keeps succeeding").toBe(200);
	const fileAfter = after.body.entry?.data?.file as { id?: unknown; src?: unknown } | undefined;
	expect(fileAfter?.id, "the selection identity is retained; no availability guarantee exists").toBe(
		fixture.mediaId,
	);

	// Safe unavailability: whatever address the value still carries must NOT
	// serve a successful download for the removed asset.
	if (typeof fileAfter?.src === "string" && fileAfter.src.length > 0) {
		const assetUrl = new URL(fileAfter.src, PERSISTENT_DEVELOPMENT_ORIGIN);
		const asset = await fetch(assetUrl, { redirect: "error" });
		expect(
			asset.ok,
			`a removed asset must not serve a successful download (${assetUrl.pathname})`,
		).toBe(false);
	}
});

test("truthful not-found and empty states, and no privileged fallback on anonymous surfaces", async () => {
	gatePages();

	// Not-found is entry:null with no error — an error is never presented as
	// an empty successful listing or vice versa.
	const notFound = await fetchFixtureRoute({
		case: "entry",
		collection: PAGES_COLLECTION,
		id: `${SYNTHETIC_FIXTURE_MARK}-does-not-exist`,
	});
	expect(notFound.status).toBe(200);
	expect(notFound.body.entry, "a public not-found read is entry:null").toBeNull();
	expect(notFound.body.error, "not-found is not a native error").toBeUndefined();
	expect(notFound.body.isPreview).toBe(false);

	// Unknown reference targets are empty pages, not errors.
	const referencesNotKnown = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: `${SYNTHETIC_FIXTURE_MARK}-does-not-exist`,
		field: "documents",
	});
	expect(referencesNotKnown.status).toBe(200);
	expect(referencesNotKnown.body.entries).toEqual([]);
	expect(referencesNotKnown.body.error).toBeUndefined();
	expect(referencesNotKnown.body.nextCursor).toBeUndefined();

	// The privileged surface stays privileged: the same anonymous caller is
	// refused by the native Admin REST API (a privileged snapshot is never a
	// public-read substitute — this control demonstrates the boundary it
	// would be crossing, and that nothing here crosses it).
	const adminRest = await fetch(
		new URL(
			`/_emdash/api/content/${PAGES_COLLECTION}/${SYNTHETIC_FIXTURE_MARK}-does-not-exist`,
			PERSISTENT_DEVELOPMENT_ORIGIN,
		),
		{ redirect: "error" },
	);
	expect(adminRest.status, "an anonymous Admin REST read is an authorization refusal").toBe(401);
});

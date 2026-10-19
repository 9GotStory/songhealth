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
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	permanentlyDeleteEntry,
	publishEntry,
	readEntry,
	readMedia,
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

/**
 * Truthful schema gate (T014 gateCollection shape; R5 corrective round 1):
 * inside the coordinator this file only ever runs opted-in, so a MISSING
 * initialized collection is a runtime-prerequisite FAILURE (UNVERIFIED,
 * never green), not a skip — the coordinator's coverage journal makes any
 * non-passed status non-success as well, and this keeps the worker itself
 * honest. Outside the coordinator the whole file is already skipped at
 * collection time.
 */
function gateCollection(readiness: CollectionReadiness, slug: string, what: string): void {
	if (readiness.outcome === "missing") {
		throw new Error(
			`RUNTIME PREREQUISITE MISSING — the ${slug} collection is not initialized in the active native schema, so ${what} cannot be exercised; this coordinated run is UNVERIFIED, never a passing skip (the ordinary no-opt-in skip gate is unaffected)`,
		);
	}
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
	syntheticFiltered?: boolean;
	pageTotal?: number;
	syntheticCount?: number;
	nativeErrorName?: string;
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
	options: { previewToken?: string; expectStatus?: number } = {},
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
	// R5 (corrective round 1): an error status is never interpreted as data.
	// Every caller that does not explicitly expect another status gets the
	// success assertion here, so a 500 cannot silently become "empty".
	const expected = options.expectStatus ?? 200;
	expect(
		response.status,
		`the fixture-route ${searchParams.case ?? "probe"} request must answer HTTP ${expected} (got ${response.status}${typeof body.error === "string" ? ` ${body.error}` : ""}; an error response is never interpreted as data)`,
	).toBe(expected);
	return {
		status: response.status,
		body,
		cacheControl: response.headers.get("cache-control") ?? "",
	};
}

/**
 * The entries array of a fixture-route list response, with its SHAPE
 * validated before any interpretation (R5): a missing or non-array entries
 * field fails loudly instead of reading as an empty page.
 */
function entriesOf(response: { status: number; body: RouteBody }): RouteEntry[] {
	expect(
		Array.isArray(response.body.entries),
		"a fixture-route list response must carry an array entries field (malformed shape is never an empty page)",
	).toBe(true);
	return response.body.entries as RouteEntry[];
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
			marker: SYNTHETIC_FIXTURE_MARK,
			limit: "100",
			...(cursor !== undefined ? { cursor } : {}),
		});
		expect(
			response.body.error,
			`the ${collection} collection read must not report a native error`,
		).toBeUndefined();
		expect(
			response.body.syntheticFiltered,
			`the ${collection} collection read must declare its synthetic-namespace filtering`,
		).toBe(true);
		const entries = entriesOf(response);
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
// Coordinator-owned fixture ownership (R3, corrective round 1): intent is
// retained BEFORE every native write, ambiguous attempts are reconciled
// through supported native reads before ANY ownership evidence is cleared,
// and prior interrupted-run manifests are consumed as recovery inputs.
// ---------------------------------------------------------------------------

/** One retained ownership/intent record (JSONL line). */
interface OwnershipRecord {
	phase: string;
	kind?: string;
	collection?: string;
	id?: string;
	slug?: string;
	filename?: string;
	[key: string]: unknown;
}

/** The identity part of an ownership record, without its phase. */
type OwnershipIdentity = Omit<OwnershipRecord, "phase">;

/** The run's test-status journal path (R5), when coordinated. */
const RUN_STATUS_ENV = "SONGHEALTH_T021_RUN_STATUS";

/** Prior-run manifests handed over by the coordinator for recovery (R3). */
const RECOVERY_MANIFESTS_ENV = "SONGHEALTH_T021_RECOVERY_MANIFESTS";

async function fsPromisesOf(): Promise<{
	appendFile: (p: string, data: string, encoding: "utf8") => Promise<void>;
	readFile: (p: string, encoding: "utf8") => Promise<string>;
	unlink: (p: string) => Promise<void>;
}> {
	const specifier = "node:fs/promises";
	return (await import(specifier)) as unknown as {
		appendFile: (p: string, data: string, encoding: "utf8") => Promise<void>;
		readFile: (p: string, encoding: "utf8") => Promise<string>;
		unlink: (p: string) => Promise<void>;
	};
}

function manifestPathOf(): string | undefined {
	const value = ambientNodeProcess?.env?.[OWNERSHIP_MANIFEST_ENV];
	return value !== undefined && value.trim().length > 0 ? value : undefined;
}

async function appendRecord(target: string, record: OwnershipRecord): Promise<void> {
	const fsPromises = await fsPromisesOf();
	await fsPromises.appendFile(target, `${JSON.stringify(record)}\n`, "utf8");
}

/** Append one ownership record to the coordinator-owned manifest, if any. */
async function manifestRecord(record: OwnershipRecord): Promise<void> {
	const target = manifestPathOf();
	if (target === undefined) {
		return;
	}
	await appendRecord(target, record);
}

/**
 * Read one manifest file (R3-B, corrective round 2): tri-state, never a
 * silent empty. `absent` (ENOENT) is a legitimate nothing-owned outcome;
 * `unreadable` (any other read failure) is UNKNOWN evidence that must be
 * preserved; `ok` carries the parsed records (malformed lines included as
 * phase "unreadable" records so they can never silently count as resolved).
 */
async function readManifest(
	target: string,
): Promise<
	| { status: "ok"; records: OwnershipRecord[] }
	| { status: "absent" }
	| { status: "unreadable"; reason: string }
> {
	let contents: string;
	try {
		const fsPromises = await fsPromisesOf();
		contents = await fsPromises.readFile(target, "utf8");
	} catch (cause) {
		const code = (cause as { code?: unknown }).code;
		if (code === "ENOENT") {
			return { status: "absent" };
		}
		return { status: "unreadable", reason: String(code ?? (cause as Error).message) };
	}
	const records: OwnershipRecord[] = [];
	for (const line of contents.split("\n")) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			continue;
		}
		try {
			records.push(JSON.parse(trimmed) as OwnershipRecord);
		} catch {
			records.push({ phase: "unreadable", raw: trimmed });
		}
	}
	return { status: "ok", records };
}

/**
 * Remove one file; ONLY a successful removal or a proven ENOENT returns
 * true (R3-B: a non-ENOENT removal failure is reported, never swallowed —
 * the ownership evidence may still exist).
 */
async function unlinkIfProvenAbsent(target: string): Promise<{ removed: boolean; failure?: string }> {
	try {
		const fsPromises = await fsPromisesOf();
		await fsPromises.unlink(target);
		return { removed: true };
	} catch (cause) {
		const code = (cause as { code?: unknown }).code;
		if (code === "ENOENT") {
			return { removed: true };
		}
		return { removed: false, failure: String(code ?? (cause as Error).message) };
	}
}

/**
 * Remove the manifest ONLY after a successful, validated read establishes
 * that every retained identity is proven resolved (R3-B, corrective round
 * 2): an UNREADABLE file is unknown evidence that is never unlinked, and a
 * failed removal (non-ENOENT) is reported rather than treated as success.
 * Returns {ok, failure?}; its continued existence after a run always means
 * recoverable-or-unknown owned-fixture evidence.
 */
async function manifestRemove(): Promise<{ ok: boolean; failure?: string }> {
	const target = manifestPathOf();
	if (target === undefined) {
		return { ok: true };
	}
	const read = await readManifest(target);
	if (read.status === "absent") {
		return { ok: true };
	}
	if (read.status === "unreadable") {
		return {
			ok: false,
			failure: `the ownership manifest ${target} could not be read (${read.reason}) — unknown evidence is preserved, never removed`,
		};
	}
	const unresolved = unresolvedIdentities(read.records);
	if (unresolved.length > 0) {
		return { ok: false };
	}
	const removal = await unlinkIfProvenAbsent(target);
	if (!removal.removed) {
		return {
			ok: false,
			failure: `the ownership manifest ${target} could not be removed (${removal.failure}) — treating as preserved evidence`,
		};
	}
	return { ok: true };
}

/** The stable identity key of one ownership record. */
function identityKey(record: OwnershipRecord): string {
	if (record.kind === "entry") {
		return `entry:${String(record.collection ?? "")}:${String(record.slug ?? record.id ?? "")}`;
	}
	if (record.kind === "media") {
		return `media:${String(record.id ?? record.filename ?? "")}`;
	}
	return `${String(record.phase)}:${String(record.id ?? record.slug ?? record.filename ?? "")}`;
}

/**
 * Every intent/created identity not yet proven resolved by a matching
 * `resolved` record (R3): these are the ambiguous-or-outstanding owned
 * attempts that MUST be reconciled before any evidence is cleared. An
 * unreadable line keeps the whole file unresolved (fail closed).
 */
function unresolvedIdentities(records: OwnershipRecord[]): OwnershipRecord[] {
	const resolved = new Set<string>();
	for (const record of records) {
		// `resolved` marks proven resolution; `refused` marks a
		// SOURCE-PROVEN NON-COMMIT (R3-A, corrective round 2): the native
		// create/upload was definitely refused before any insert — a 4xx
		// decided before the write, or a deduplicated upload returning a
		// pre-existing asset. This run owns NOTHING under that identity, so
		// it is settled without adoption or deletion; any pre-existing
		// record under the same slug belongs to whoever created it earlier.
		if (record.phase === "resolved" || record.phase === "refused") {
			resolved.add(identityKey(record));
		}
	}
	const KNOWN_PHASES = new Set(["intent", "created", "resolved", "refused", "unreadable"]);
	const KNOWN_KINDS = new Set(["entry", "media"]);
	const outstanding: OwnershipRecord[] = [];
	const seen = new Set<string>();
	for (const record of records) {
		// R3-B (corrective round 3): an UNKNOWN phase or kind is unknown
		// ownership evidence — it stays outstanding so its file can never be
		// silently consumed as "nothing unresolved". Only the settlement
		// markers (resolved/refused) and the handled attempt shapes
		// (intent/created of a known kind) are non-outstanding; `unreadable`
		// lines were already preserved.
		if (typeof record.phase !== "string" || !KNOWN_PHASES.has(record.phase)) {
			outstanding.push(record);
			continue;
		}
		if (record.phase === "unreadable") {
			outstanding.push(record);
			continue;
		}
		if (record.phase !== "intent" && record.phase !== "created") {
			continue; // resolved / refused settlement markers
		}
		if (typeof record.kind !== "string" || !KNOWN_KINDS.has(record.kind)) {
			outstanding.push(record);
			continue;
		}
		const key = identityKey(record);
		if (resolved.has(key) || seen.has(key)) {
			continue;
		}
		seen.add(key);
		outstanding.push(record);
	}
	return outstanding;
}

/** Mark one identity proven resolved (append-only; never erase the intent). */
async function manifestMarkResolved(record: OwnershipRecord): Promise<void> {
	await manifestRecord({
		phase: "resolved",
		kind: record.kind,
		...(record.collection !== undefined ? { collection: record.collection } : {}),
		...(record.slug !== undefined ? { slug: record.slug } : {}),
		...(record.id !== undefined ? { id: record.id } : {}),
		...(record.filename !== undefined ? { filename: record.filename } : {}),
	});
}

/**
 * Trash-aware lookup of an entry by SLUG through the supported native trash
 * listing (the accepted helper's id-based matcher cannot match slugs). Same
 * terminal-cursor discipline: only an exhausted well-formed listing proves
 * absence; anything else is unknown.
 */
async function findTrashedBySlug(
	collection: string,
	slug: string,
): Promise<"in-trash" | "not-in-trash" | "unknown"> {
	const followed = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < 200; page += 1) {
		let result;
		try {
			result = await cmsRequest(
				admin,
				`/_emdash/api/content/${encodeURIComponent(collection)}/trash`,
				{ searchParams: { limit: "100", ...(cursor !== undefined ? { cursor } : {}) } },
			);
		} catch {
			return "unknown";
		}
		if (!result.ok) {
			return "unknown";
		}
		const data = nativeDataOf(result);
		const items = data?.items;
		if (data === undefined || !Array.isArray(items)) {
			return "unknown";
		}
		for (const item of items) {
			const record = item as Record<string, unknown>;
			if (record.slug === slug || record.id === slug) {
				return "in-trash";
			}
		}
		const nextCursor: unknown = data.nextCursor;
		if (nextCursor === undefined || nextCursor === "") {
			return "not-in-trash";
		}
		if (typeof nextCursor !== "string" || nextCursor === cursor || followed.has(nextCursor)) {
			return "unknown";
		}
		if (cursor !== undefined) {
			followed.add(cursor);
		}
		cursor = nextCursor;
	}
	return "unknown";
}

/** Prove an owned entry identity fully absent (live read AND trash listing). */
async function entryProvenAbsent(collection: string, slug: string): Promise<boolean> {
	const trash = await findTrashedBySlug(collection, slug);
	if (trash !== "not-in-trash") {
		return false;
	}
	try {
		const read = await readEntry(admin, collection, slug);
		return read.status === 404;
	} catch {
		return false;
	}
}

/**
 * Reconcile ONE retained entry identity (R3): a create whose outcome was
 * never observed is decided ONLY from a successful, usable current-state
 * read. A live entry under THIS run's fresh unique synthetic slug is
 * demonstrably this suite's committed fixture (a pre-existing record cannot
 * carry the fresh random slug) — it is adopted and deleted through the
 * supported native operations, with the synthetic-prefix validation
 * refusing anything else. Proven absence resolves the intent as a
 * non-commit; an unreadable state stays unresolved and preserves evidence.
 */
async function reconcileEntryIdentity(
	record: OwnershipRecord,
	target: string,
): Promise<string | undefined> {
	const collection = record.collection;
	const slug = record.slug ?? record.id;
	if (
		typeof collection !== "string" ||
		typeof slug !== "string" ||
		!slug.startsWith(`${SYNTHETIC_FIXTURE_MARK}-`)
	) {
		return `retained entry identity ${JSON.stringify(record)} is not a validatable synthetic fixture identity — preserving it unresolved`;
	}
	let live = false;
	try {
		const read = await readEntry(admin, collection, slug);
		if (read.ok) {
			live = true;
		} else if (read.status !== 404) {
			return `the reconciliation read for ${collection}/${slug} was refused (${nativeRefusalOf(read)}) — outcome unknown`;
		}
	} catch (cause) {
		return `the reconciliation read for ${collection}/${slug} failed (${cause instanceof Error ? cause.message : String(cause)}) — outcome unknown`;
	}
	if (!live) {
		const trash = await findTrashedBySlug(collection, slug);
		if (trash === "not-in-trash") {
			await appendRecord(target, { phase: "resolved", kind: "entry", collection, slug, how: "proven-absent" });
			return undefined;
		}
		if (trash === "in-trash") {
			// A committed fixture already sitting in trash: purge it through
			// the supported administrator path, then prove the absence.
			try {
				const purge = await permanentlyDeleteEntry(admin, collection, slug);
				if (!purge.ok && purge.status !== 404) {
					return `purging the trashed fixture ${collection}/${slug} was refused (${nativeRefusalOf(purge)}) — still owned`;
				}
			} catch (cause) {
				return `purging the trashed fixture ${collection}/${slug} failed (${cause instanceof Error ? cause.message : String(cause)}) — still owned`;
			}
			if (await entryProvenAbsent(collection, slug)) {
				await appendRecord(target, { phase: "resolved", kind: "entry", collection, slug, how: "adopted-from-trash" });
				return undefined;
			}
			return `the trashed fixture ${collection}/${slug} could not be proven purged — still owned`;
		}
		return `the trash state of ${collection}/${slug} is unknown — outcome unknown`;
	}
	// Live committed fixture: trash-first, then purge, then prove absence.
	try {
		const trashed = await trashEntry(admin, collection, slug);
		if (!trashed.ok && trashed.status !== 404) {
			return `trashing the adopted fixture ${collection}/${slug} was refused (${nativeRefusalOf(trashed)}) — still owned`;
		}
		const purge = await permanentlyDeleteEntry(admin, collection, slug);
		if (!purge.ok && purge.status !== 404) {
			return `purging the adopted fixture ${collection}/${slug} was refused (${nativeRefusalOf(purge)}) — still owned`;
		}
	} catch (cause) {
		return `deleting the adopted fixture ${collection}/${slug} failed (${cause instanceof Error ? cause.message : String(cause)}) — still owned`;
	}
	if (await entryProvenAbsent(collection, slug)) {
		await appendRecord(target, { phase: "resolved", kind: "entry", collection, slug, how: "adopted-and-purged" });
		return undefined;
	}
	return `the adopted fixture ${collection}/${slug} could not be proven absent after deletion — still owned`;
}

/**
 * Reconcile ONE retained media identity (R3): an id-bearing record is
 * reconciled through the media read; an ambiguous upload (no id) through
 * the supported media LISTING searched by this run's unique synthetic
 * filename — a found exact filename is demonstrably this suite's committed
 * upload. The synthetic-prefix validation applies before any deletion.
 */
async function reconcileMediaIdentity(
	record: OwnershipRecord,
	target: string,
): Promise<string | undefined> {
	if (typeof record.id === "string") {
		let present = true;
		let itemFilename: string | undefined;
		try {
			const read = await readMedia(admin, record.id);
			if (read.status === 404) {
				present = false;
			} else if (!read.ok) {
				return `the media read for ${record.id} was refused (${nativeRefusalOf(read)}) — outcome unknown`;
			}
			const item = nativeItemOf(read);
			if (present && typeof item?.filename === "string") {
				itemFilename = item.filename;
			}
		} catch (cause) {
			return `the media read for ${record.id} failed (${cause instanceof Error ? cause.message : String(cause)}) — outcome unknown`;
		}
		if (!present) {
			await appendRecord(target, { phase: "resolved", kind: "media", id: record.id, how: "proven-absent" });
			return undefined;
		}
		// R3-B (corrective round 3): an id alone authorizes NOTHING. Deletion
		// requires a VALIDATED synthetic ownership identity — the live
		// asset's own filename must carry this suite's synthetic prefix, and
		// when the retained record also carries a filename it must agree. A
		// media id without validated synthetic ownership is preserved
		// unresolved, never deleted.
		const syntheticPrefix = `${SYNTHETIC_FIXTURE_MARK}-`;
		const recordedFilename = typeof record.filename === "string" ? record.filename : undefined;
		if (
			typeof itemFilename !== "string" ||
			!itemFilename.startsWith(syntheticPrefix) ||
			(recordedFilename !== undefined && recordedFilename !== itemFilename)
		) {
			return `the media record ${JSON.stringify({ id: record.id, filename: recordedFilename })} has no validated synthetic ownership identity (asset filename ${JSON.stringify(itemFilename)}) — preserving it unresolved, never deleting`;
		}
		try {
			const removal = await deleteMedia(admin, record.id);
			if (!removal.ok && removal.status !== 404) {
				return `removing the adopted media ${record.id} was refused (${nativeRefusalOf(removal)}) — still owned`;
			}
			const verify = await readMedia(admin, record.id);
			if (verify.ok || verify.status !== 404) {
				return `the adopted media ${record.id} could not be proven removed — still owned`;
			}
		} catch (cause) {
			return `removing the adopted media ${record.id} failed (${cause instanceof Error ? cause.message : String(cause)}) — still owned`;
		}
		await appendRecord(target, { phase: "resolved", kind: "media", id: record.id, how: "adopted-and-removed" });
		return undefined;
	}
	const filename = record.filename;
	if (typeof filename !== "string" || !filename.startsWith(`${SYNTHETIC_FIXTURE_MARK}-`)) {
		return `retained media identity ${JSON.stringify(record)} is not a validatable synthetic fixture identity — preserving it unresolved`;
	}
	// Ambiguous upload: full traversal of the supported listing, matched by
	// the exact unique synthetic filename.
	const followed = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < 200; page += 1) {
		let result;
		try {
			result = await cmsRequest(admin, "/_emdash/api/media", {
				searchParams: {
					q: filename,
					limit: "100",
					...(cursor !== undefined ? { cursor } : {}),
				},
			});
		} catch (cause) {
			return `the media listing search for ${filename} failed (${cause instanceof Error ? cause.message : String(cause)}) — outcome unknown`;
		}
		if (!result.ok) {
			return `the media listing search for ${filename} was refused (${nativeRefusalOf(result)}) — outcome unknown`;
		}
		const data = nativeDataOf(result);
		const items = data?.items;
		if (data === undefined || !Array.isArray(items)) {
			return `the media listing search for ${filename} returned a malformed page — outcome unknown`;
		}
		const match = items.find(
			(item) => (item as Record<string, unknown>).filename === filename,
		) as Record<string, unknown> | undefined;
		if (match !== undefined && typeof match.id === "string") {
			try {
				const removal = await deleteMedia(admin, match.id);
				if (!removal.ok && removal.status !== 404) {
					return `removing the adopted media for ${filename} was refused (${nativeRefusalOf(removal)}) — still owned`;
				}
				const verify = await readMedia(admin, match.id);
				if (verify.ok || verify.status !== 404) {
					return `the adopted media for ${filename} could not be proven removed — still owned`;
				}
			} catch (cause) {
				return `removing the adopted media for ${filename} failed (${cause instanceof Error ? cause.message : String(cause)}) — still owned`;
			}
			await appendRecord(target, { phase: "resolved", kind: "media", filename, how: "adopted-and-removed" });
			return undefined;
		}
		const nextCursor: unknown = data?.nextCursor;
		if (nextCursor === undefined || nextCursor === "") {
			await appendRecord(target, { phase: "resolved", kind: "media", filename, how: "proven-absent" });
			return undefined;
		}
		if (typeof nextCursor !== "string" || nextCursor === cursor || followed.has(nextCursor)) {
			return `the media listing search for ${filename} could not be fully traversed — outcome unknown`;
		}
		if (cursor !== undefined) {
			followed.add(cursor);
		}
		cursor = nextCursor;
	}
	return `the media listing search for ${filename} did not terminate — outcome unknown`;
}

/**
 * Reconcile every outstanding identity in one manifest file (R3). Returns
 * the unresolved failure strings; every proven resolution is appended to
 * the SAME file so the coordinator can observe consumption.
 */
async function reconcileManifest(target: string): Promise<string[]> {
	const read = await readManifest(target);
	if (read.status === "absent") {
		return [];
	}
	if (read.status === "unreadable") {
		return [`the ownership manifest ${target} could not be read (${read.reason}) — unknown evidence is preserved unresolved`];
	}
	const records = read.records;
	const failures: string[] = [];
	for (const record of unresolvedIdentities(records)) {
		if (record.phase === "unreadable") {
			failures.push(`an unreadable ownership line survives in ${target} — preserving it unresolved`);
			continue;
		}
		if (typeof record.phase !== "string" || (record.phase !== "intent" && record.phase !== "created")) {
			failures.push(
				`an unknown ownership record shape (phase=${JSON.stringify(record.phase)}, kind=${JSON.stringify(record.kind)}) survives in ${target} — unknown evidence is preserved, never consumed`,
			);
			continue;
		}
		if (record.kind !== "entry" && record.kind !== "media") {
			failures.push(
				`an unknown ownership kind ${JSON.stringify(record.kind)} survives in ${target} — unknown evidence is preserved, never consumed`,
			);
			continue;
		}
		const failure =
			record.kind === "entry"
				? await reconcileEntryIdentity(record, target)
				: await reconcileMediaIdentity(record, target);
		if (failure !== undefined) {
			failures.push(failure);
		}
	}
	return failures;
}

/** The synthetic slug a fixture entry will use (known BEFORE creation). */
function nextSyntheticSlug(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK}-${kind}-${crypto.randomUUID().slice(0, 13)}`;
}

/** Append one test-status line to the coordinator's coverage journal (R5). */
async function statusRecord(entry: { title: string; status: string }): Promise<void> {
	const target = ambientNodeProcess?.env?.[RUN_STATUS_ENV];
	if (target === undefined || target.trim().length === 0) {
		return;
	}
	const fsPromises = await fsPromisesOf();
	await fsPromises.appendFile(target, `${JSON.stringify(entry)}\n`, "utf8");
}

/**
 * Record the create-side outcome classification for one retained intent
 * (R3-A, corrective round 2). A received **4xx** is a SOURCE-PROVEN
 * NON-COMMIT on the pinned native create/upload routes — authorization,
 * body validation and the duplicate-slug CONFLICT are all decided BEFORE the
 * insert (the same pinned-source discipline the accepted T020 round-3
 * correction established) — so the intent is settled as `refused`: this run
 * owns NOTHING under it and a pre-existing record with the same synthetic
 * slug is never adopted or deleted by that intent. A `deduplicated` upload
 * likewise returned a PRE-EXISTING asset and is refused/not-ours. 5xx and
 * transport losses stay AMBIGUOUS (the pinned repositories commit the insert
 * and only then read back): no record is appended and the read-side
 * reconciliation decides from current state.
 */
async function recordCreateOutcome(
	identity: OwnershipIdentity,
	result: { ok: boolean; status: number },
	options: { reusedExistingMedia?: boolean } = {},
): Promise<void> {
	if (result.ok && options.reusedExistingMedia !== true) {
		await manifestRecord({ ...identity, phase: "created" });
		return;
	}
	if (result.ok || (result.status >= 400 && result.status < 500)) {
		await manifestRecord({
			...identity,
			phase: "refused",
			reason:
				options.reusedExistingMedia === true
					? "deduplicated-pre-existing-asset"
					: `native-refusal-${result.status}`,
		});
	}
	// 5xx / lost acknowledgment: ambiguous — the intent stands for
	// read-side reconciliation.
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
	await recordCreateOutcome(
		{ kind: "entry", collection: PAGES_COLLECTION, slug, ...(created.entryId !== undefined ? { id: created.entryId } : {}) },
		created.result,
	);
	expect(created.result.ok, "the synthetic page fixture must save").toBe(true);
	expect(created.entryId, "the page fixture id must come from the native response").toBeTruthy();
	return { entryId: created.entryId!, slug, title };
}

/**
 * Create one OWNED synthetic Document fixture around a fresh owned media
 * upload (R3: the media INTENT — this run's unique synthetic filename — is
 * retained BEFORE the upload, so an upload that commits while its
 * acknowledgment is lost stays recoverable through the listing search).
 */
async function createOwnedDocument(kind: string): Promise<{
	entryId: string;
	slug: string;
	title: string;
	mediaId: string;
	filename: string;
}> {
	const filename = `${SYNTHETIC_FIXTURE_MARK}-media-${crypto.randomUUID().slice(0, 8)}.png`;
	await manifestRecord({ phase: "intent", kind: "media", filename });
	const upload = await uploadSyntheticMedia(admin, { filename });
	await recordCreateOutcome(
		{ kind: "media", filename, ...(upload.mediaId !== undefined ? { id: upload.mediaId } : {}) },
		upload.result,
		{ reusedExistingMedia: upload.reusedExistingMedia === true },
	);
	expect(upload.result.ok, "the synthetic fixture media upload must succeed").toBe(true);
	expect(upload.mediaId, "a media id must be returned and registered for owned cleanup").toBeTruthy();
	const title = uniqueTitle(kind);
	const slug = nextSyntheticSlug(kind);
	await manifestRecord({ phase: "intent", kind: "entry", collection: DOCUMENTS_COLLECTION, slug });
	const created = await createSyntheticEntry(admin, DOCUMENTS_COLLECTION, {
		data: { title, file: fileValueFor(upload.mediaId!) },
		slug,
	});
	await recordCreateOutcome(
		{ kind: "entry", collection: DOCUMENTS_COLLECTION, slug, ...(created.entryId !== undefined ? { id: created.entryId } : {}) },
		created.result,
	);
	expect(created.result.ok, "the synthetic Document fixture must save").toBe(true);
	return { entryId: created.entryId!, slug, title, mediaId: upload.mediaId!, filename };
}

/**
 * Create one OWNED synthetic health-report fixture with the same discipline
 * (R3: the Report had no pre-write intent in the reviewed candidate). The
 * required `report_document` reference is supplied by the caller from an
 * already-created owned Document.
 */
async function createOwnedHealthReport(
	documentEntryId: string,
): Promise<{ entryId: string; slug: string; title: string }> {
	const title = uniqueTitle("report");
	const slug = nextSyntheticSlug("report");
	await manifestRecord({
		phase: "intent",
		kind: "entry",
		collection: HEALTH_REPORTS_COLLECTION,
		slug,
	});
	const created = await createSyntheticEntry(admin, HEALTH_REPORTS_COLLECTION, {
		data: { title },
		slug,
		references: { report_document: [documentEntryId] },
	});
	await recordCreateOutcome(
		{ kind: "entry", collection: HEALTH_REPORTS_COLLECTION, slug, ...(created.entryId !== undefined ? { id: created.entryId } : {}) },
		created.result,
	);
	expect(
		created.result.ok,
		"the synthetic health report must save with its required reference",
	).toBe(true);
	expect(created.entryId, "the report fixture id must come from the native response").toBeTruthy();
	return { entryId: created.entryId!, slug, title };
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

	// R3 — CONSUME prior interrupted-run manifests handed over by the
	// coordinator: every recorded synthetic identity is reconciled through
	// supported native reads (adopted-and-deleted, or proven non-committed)
	// BEFORE this run claims anything. A fully consumed file is removed;
	// anything unresolved fails this worker loudly with the evidence
	// preserved — a fresh worker never erases old intent merely because its
	// in-memory registry is empty.
	const recoveryRaw = ambientNodeProcess?.env?.[RECOVERY_MANIFESTS_ENV];
	const recoveryPaths = (recoveryRaw ?? "")
		.split(":")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
	const recoveryFailures: string[] = [];
	for (const recoveryPath of recoveryPaths) {
		const failures = await reconcileManifest(recoveryPath);
		if (failures.length > 0) {
			recoveryFailures.push(...failures);
			continue;
		}
		const removal = await unlinkIfProvenAbsent(recoveryPath);
		if (!removal.removed) {
			recoveryFailures.push(
				`the consumed recovery manifest ${recoveryPath} could not be removed (${removal.failure}) — preserved as evidence`,
			);
		}
	}
	if (recoveryFailures.length > 0) {
		throw new Error(
			`prior-run owned-fixture recovery could not be completed — unresolved recorded identities are preserved for the next run: ${recoveryFailures.join("; ")}`,
		);
	}
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
	// R5 — the coverage journal: the coordinator turns any non-passed
	// recorded status into a non-success run even when the worker exits 0.
	await statusRecord({ title: test.info().title, status: test.info().status ?? "unknown" });

	// Each cleanup runs INDEPENDENTLY; combined failures are reported only
	// after all attempts, and unresolved fixtures stay registered (the
	// helpers' reconciliation contract) so a later cleanup can retry them.
	const failures = await cleanupOwned(admin);

	// R3 — reconcile every retained intent/created identity that the in-memory
	// registry does not account for (an ambiguous committed create, an
	// uncertain media upload, a Report attempt) BEFORE any ownership evidence
	// may be cleared. Ownership evidence is removed only when nothing
	// outstanding remains.
	const manifestTarget = manifestPathOf();
	const reconciliationFailures =
		manifestTarget === undefined ? [] : await reconcileManifest(manifestTarget);
	const cleared = await manifestRemove();

	expect(
		failures,
		"owned synthetic fixtures must be reconciled after each case (unresolved fixtures stay registered for a later retry and are reported, never hidden)",
	).toEqual([]);
	expect(
		reconciliationFailures,
		"every ambiguous owned attempt must be reconciled through supported native reads before ownership evidence is cleared (primary failures are preserved alongside)",
	).toEqual([]);
	expect(
		cleared.ok,
		"the ownership manifest may be removed only after a successful validated read proves every retained identity resolved — unreadable or failed-removal evidence is preserved, never erased",
	).toBe(true);
	expect(cleared.failure ?? "", "no manifest evidence may be lost silently").toBe("");
});

test.afterAll(async () => {
	// Safety net: normally a no-op (afterEach resolved everything). Every
	// attempt is still made and reported before failing loudly.
	const failures = await cleanupOwned(admin);
	const manifestTarget = manifestPathOf();
	const reconciliationFailures =
		manifestTarget === undefined ? [] : await reconcileManifest(manifestTarget);
	const cleared = await manifestRemove();
	const clearFailures = cleared.ok ? [] : [cleared.failure ?? "ownership evidence could not be cleared"];
	if (failures.length > 0 || reconciliationFailures.length > 0 || clearFailures.length > 0) {
		await manifestRecord({
			phase: "after-all-residual",
			failures: [...failures, ...reconciliationFailures, ...clearFailures],
		});
		throw new Error(
			`afterAll reconciliation failures after all attempts: ${[...failures, ...reconciliationFailures, ...clearFailures].join("; ")} (ownership evidence preserved)`,
		);
	}
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
	const syntheticProbeId = nextSyntheticSlug("contract-probe");
	for (const [label, params] of [
		["unknown case", { case: "dump-everything" }],
		["non-allowlisted collection", { case: "collection", collection: "_emdash", marker: SYNTHETIC_FIXTURE_MARK }],
		[
			"collection read without the synthetic marker",
			{ case: "collection", collection: PAGES_COLLECTION },
		],
		[
			"collection read with a foreign marker",
			{ case: "collection", collection: PAGES_COLLECTION, marker: "some-other-namespace" },
		],
		[
			"real-record slug refused (R1)",
			{ case: "entry", collection: PAGES_COLLECTION, id: "real-editorial-homepage" },
		],
		[
			"internal ULID refused (R1)",
			{ case: "entry", collection: PAGES_COLLECTION, id: "01HXYZULIDINTERNAL0000000" },
		],
		[
			"references on a real-record slug refused (R1)",
			{
				case: "references",
				collection: PAGES_COLLECTION,
				id: "real-editorial-homepage",
				field: "documents",
			},
		],
		[
			"non-allowlisted reference field",
			{
				case: "references",
				collection: PAGES_COLLECTION,
				id: syntheticProbeId,
				field: "not-a-bound-field",
			},
		],
		[
			"malformed entry id",
			{ case: "entry", collection: PAGES_COLLECTION, id: "../_emdash/api" },
		],
	] as [string, Record<string, string>][]) {
		const response = await fetchFixtureRoute(params, { expectStatus: 400 });
		expect(response.body.error, `${label} refusal carries its error code`).toBeTruthy();
	}
	// R1: the synthetic-namespace refusals carry their distinct codes.
	const nonSynthetic = await fetchFixtureRoute(
		{ case: "entry", collection: PAGES_COLLECTION, id: "real-editorial-homepage" },
		{ expectStatus: 400 },
	);
	expect(nonSynthetic.body.error, "a non-synthetic id is refused as NON_SYNTHETIC_ID").toBe(
		"NON_SYNTHETIC_ID",
	);
	const unmarked = await fetchFixtureRoute(
		{ case: "collection", collection: PAGES_COLLECTION },
		{ expectStatus: 400 },
	);
	expect(
		unmarked.body.error,
		"a collection read without the synthetic marker is refused",
	).toBe("SYNTHETIC_MARKER_REQUIRED");
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
		{ case: "collection", collection: PAGES_COLLECTION, marker: SYNTHETIC_FIXTURE_MARK, limit: "100" },
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
	const report = await createOwnedHealthReport(documentFixture.entryId);
	await publishOwned(HEALTH_REPORTS_COLLECTION, report.entryId);
	const reportSlug = report.slug;

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
	expect(entriesOf(standalone).map((entry: RouteEntry) => entry.id)).toEqual(
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
	const pageOneIds = entriesOf(pageOne).map((entry: RouteEntry) => entry.id);
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
	const pageTwoIds = entriesOf(pageTwo).map((entry: RouteEntry) => entry.id);
	expect(pageTwoIds).toEqual(targets.slice(2).map((target) => target.slug));
	expect(pageTwo.body.nextCursor, "the terminal page carries no cursor").toBeUndefined();
	expect(new Set([...pageOneIds, ...pageTwoIds]).size).toBe(3);

	// Collection-level pagination stays structural (no claim about unrelated
	// real content — the pages are explicitly synthetic-filtered): bounded
	// pages, disjoint ids, an explicit terminal page. R5: status, error and
	// entries SHAPE are validated before any emptiness is interpreted, so an
	// error response can never pass as a short terminal page.
	const collectionPageOne = await fetchFixtureRoute({
		case: "collection",
		collection: PAGES_COLLECTION,
		marker: SYNTHETIC_FIXTURE_MARK,
		limit: "2",
	});
	expect(collectionPageOne.body.error, "the collection page must not report an error").toBeUndefined();
	expect(collectionPageOne.body.syntheticFiltered).toBe(true);
	const collectionPageOneEntries = entriesOf(collectionPageOne);
	expect(collectionPageOneEntries.length).toBeLessThanOrEqual(2);
	if (collectionPageOne.body.nextCursor !== undefined) {
		const collectionPageTwo = await fetchFixtureRoute({
			case: "collection",
			collection: PAGES_COLLECTION,
			marker: SYNTHETIC_FIXTURE_MARK,
			limit: "2",
			cursor: collectionPageOne.body.nextCursor,
		});
		expect(collectionPageTwo.body.error, "the second collection page must not report an error").toBeUndefined();
		const pageOneSet = new Set(entriesOf(collectionPageOne).map((entry: RouteEntry) => entry.id));
		for (const entry of entriesOf(collectionPageTwo)) {
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
	// publication. R5 (corrective round 1): availability is established with
	// a POSITIVE control first — the asset's supported public address is read
	// from the native media metadata and fetched successfully BEFORE removal —
	// and the SAME address must be safely unavailable AFTER removal. A
	// retained selection id alone never establishes the boundary, and the
	// check is never conditionally omitted: no usable address is a loud
	// failure, not a pass.
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

	// Establish the owned asset's supported public address (native media
	// metadata: local assets carry a relative src under the app's media file
	// endpoint; the listing adds a relative url). Confined to the one
	// authorized origin.
	const mediaRead = await readMedia(admin, fixture.mediaId);
	expect(mediaRead.ok, "the owned media metadata must be readable before removal").toBe(true);
	const mediaItem = (nativeItemOf(mediaRead) ?? {}) as Record<string, unknown>;
	const addressCandidate = [mediaItem.src, mediaItem.url].find(
		(value) => typeof value === "string" && value.length > 0,
	) as string | undefined;
	expect(
		typeof addressCandidate === "string" && addressCandidate.length > 0,
		"the owned asset must expose a supported public address (src/url) for the availability control — a selection id alone does not establish the boundary",
	).toBe(true);
	const assetUrl = new URL(addressCandidate as string, PERSISTENT_DEVELOPMENT_ORIGIN);
	expect(
		assetUrl.origin,
		"the asset address must resolve onto the one authorized development origin",
	).toBe(PERSISTENT_DEVELOPMENT_ORIGIN);

	// Positive control: the address serves the asset while it exists.
	const positive = await fetch(assetUrl, { redirect: "error" });
	expect(
		positive.ok,
		`the availability control must first observe the owned asset as servable (${assetUrl.pathname})`,
	).toBe(true);

	// Remove the owned asset (native media removal, own asset).
	const removed = await deleteMedia(admin, fixture.mediaId);
	expect(removed.ok, "the owned media asset must be removable").toBe(true);

	// The Document stays published and readable; its file value keeps the
	// now-dangling selection identity (no byte or availability guarantee
	// exists — D-REF stays deferred)...
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

	// ...and the SAME address is now safely unavailable: a non-success fetch,
	// never an unverified successful download.
	const unavailable = await fetch(assetUrl, { redirect: "error" });
	expect(
		unavailable.ok,
		`the removed asset must not serve a successful download at the same address (${assetUrl.pathname})`,
	).toBe(false);
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

test("native error channel: a malformed pagination cursor surfaces the real native error contract, never an empty success (R5)", async () => {
	gatePages();

	// Corrective round 2 (R5-A), pinned to the exact implementation rather
	// than an invented contract: a length-bounded garbage cursor passes the
	// route's syntactic input check and reaches the native decoder.
	//
	// COLLECTION path — the pinned emdash loader CATCHES the cursor failure
	// and returns a WRAPPED error result (src/loader.ts:1835–1848: `error:
	// new Error("Failed to load collection: " + message)`, re-thrown only
	// for nothing here), so `getEmDashCollection` yields { entries: [],
	// error } (src/query.ts:887–927) and the fixture serves it as HTTP 200
	// with its native error channel. The wrapped name is "Error" — the exact
	// source controls this, not an assumed InvalidCursorError name.
	const garbageCursor = "definitely-not-a-native-cursor";
	const collectionError = await fetchFixtureRoute({
		case: "collection",
		collection: PAGES_COLLECTION,
		marker: SYNTHETIC_FIXTURE_MARK,
		limit: "10",
		cursor: garbageCursor,
	});
	expect(
		typeof collectionError.body.error === "object" && collectionError.body.error !== null,
		"the collection read with a malformed cursor must carry its (wrapped) native error — the pinned loader catches it into the error channel at HTTP 200",
	).toBe(true);
	expect(
		collectionError.body.entries,
		"an error result never presents entries as a successful page",
	).toEqual([]);
	expect(collectionError.body.nextCursor, "an error result carries no continuation cursor").toBeUndefined();

	// REFERENCES path — reachable per the pinned source (src/query.ts:1391–
	// 1428): the anchor lookup and published-status checks run BEFORE cursor
	// decoding (a nonexistent anchor returns { entries: [] } immediately and
	// can never produce this error), so the anchor is a REAL owned published
	// parent. Its garbage cursor then fails inside reference resolution and
	// the helper's own catch returns the RAW error — name preserved
	// ("InvalidCursorError", src/database/repositories/types.ts:264–295).
	const anchor = await createOwnedPage({ kind: "native-error-anchor" });
	await publishOwned(PAGES_COLLECTION, anchor.entryId);
	const referencesError = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: anchor.slug,
		field: "documents",
		limit: "10",
		cursor: garbageCursor,
	});
	const channel = referencesError.body.error as { name?: unknown } | string | undefined;
	expect(
		typeof channel === "object" && channel?.name === "InvalidCursorError",
		`the references read on a real published anchor with a malformed cursor must carry the raw native InvalidCursorError (got ${String(channel === undefined ? undefined : typeof channel === "object" ? channel?.name : channel)})`,
	).toBe(true);
	expect(
		referencesError.body.entries,
		"an error result is never presented as an empty successful page",
	).toEqual([]);
	expect(referencesError.body.nextCursor, "an error result carries no continuation cursor").toBeUndefined();

	// The legitimate missing-anchor outcome stays a SEPARATE, valid empty:
	// no error, genuinely empty page (kept explicit here so the two shapes
	// can never be confused).
	const missingAnchor = await fetchFixtureRoute({
		case: "references",
		collection: PAGES_COLLECTION,
		id: `${SYNTHETIC_FIXTURE_MARK}-does-not-exist`,
		field: "documents",
		limit: "10",
		cursor: garbageCursor,
	});
	expect(missingAnchor.body.error, "a missing anchor is an empty page, never an error").toBeUndefined();
	expect(missingAnchor.body.entries).toEqual([]);
});

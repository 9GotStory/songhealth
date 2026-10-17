// T002 — bounded native request/fixture helpers for the Feature 002 focused
// CMS checks. Test support in tests/browser/ only: no application, schema,
// seed, dependency, infrastructure, or production change is made here.
// Corrective round 1 (reviewer findings 1–6) hardened: the bootstrap
// credential path, role-restoration failure coverage, media-deduplication
// ownership safety, cleanup resilience/retention, embedded-secret redaction,
// and the configured-origin request boundary. Corrective round 2 (findings
// 1–3) further hardened: trash-aware cleanup reconciliation through the
// native trash listing (an ordinary content GET 404 is not proof of
// permanent deletion), known-secret scrubbing of response-body read
// failures, and same-application binding for administrative executors and
// role orchestrators. Corrective round 3 (findings 1–2) further hardened:
// callback failures are tracked by occurrence (a rejection with undefined
// is still a failure) and surface only as scrubbed CmsHelperError
// renderings — never the raw cause object — and combine with restore
// failures under known-secret scrubbing; trash-listing traversal validates
// the native success/list/pagination shape and treats malformed pages and
// stalled or cyclic cursors as unknown, never as proven absence; the
// one-time Product Owner-authorized corrective round 4 narrowed terminal
// validity to the native contract: only an actually absent (or explicitly
// empty) terminal cursor proves exhaustion, and any other supplied cursor
// value type is unknown. No behavior beyond the authorized T002 scope.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T002 ("Add bounded native
//   request/fixture helpers in tests/browser/cms.helpers.ts for the configured
//   existing development app, dev-bypass access, distinct native roles, public
//   synthetic media/records, fresh IDs/`_rev`, secret-redacted results and
//   owned-fixture cleanup; use existing tooling, with no production
//   authentication, permission or reference-management abstraction") and the
//   shared "Path Conventions and Shared Constraints" section (dev-bypass,
//   distinct native role credentials, returned IDs/current `_rev`, re-read
//   uncertain outcomes, clean only owned synthetic fixtures)
// - specs/002-cms-content-model/contracts/native-editorial.md — "Native
//   Request Shapes" table, `_rev` preconditions, truthful native outcomes,
//   revisions/lifecycle boundaries
// - specs/002-cms-content-model/contracts/public-read.md — published-only
//   visibility boundary these synthetic fixtures eventually exercise
// - specs/002-cms-content-model/quickstart.md — Prerequisites (single README
//   environment, dev-bypass, distinct Contributor/Author/Editor/Administrator
//   fixtures via supported native operations, mode-0600 credential scratch,
//   synthetic public-publishable data, no invented official inventories)
// - README.md §7 (development-only POST /_emdash/api/setup/dev-bypass?token=1;
//   token is secret-bearing; passkey login is never automated)
// - specs/002-cms-content-model/evidence/T001-development-inputs.md — the
//   existing fixed-name development instance, preserved data, and the
//   truthfully-pending distinct-role fixture input (§6) these helpers consume
//   without inventing
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// Context7 /websites/emdashcms (docs.emdashcms.com REST API, roles and
// permissions) first for unversioned capability orientation; every
// release-sensitive claim below is controlled by the pinned `emdash@1.1.0`
// archive (npm tarball sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==,
// byte-equal to package-lock.json, the same integrity research.md §Evidence
// independently verified), inspected at:
// - envelope: `{ success: true, data }` / `{ success: false, error: { code,
//   message, details? } }` (src/api/error.ts apiSuccess/apiError)
// - POST /_emdash/api/setup/dev-bypass?token=1 — development builds only
//   (production answers 403 "FORBIDDEN"); finds/creates the fixed dev
//   Administrator account dev@emdash.local (role 50), applies the committed
//   seed with onConflict "skip", and with ?token=1 mints the raw
//   "dev-bypass-token" PAT (scopes content:read/write, media:read/write,
//   schema:read/write, admin) that appears only in that response
//   (src/astro/routes/api/setup/dev-bypass.ts)
// - Authorization: Bearer <PAT>; the middleware resolves the token's owning
//   user record on EVERY request, so a token's effective role and disabled
//   state track the user's current database state
//   (src/astro/middleware/auth.ts handleBearerAuth)
// - native role levels Subscriber 10 / Contributor 20 / Author 30 /
//   Editor 40 / Admin 50 (docs.emdashcms.com "User roles"; source
//   ROLE_ADMIN = 50)
// - GET/PUT /_emdash/api/admin/users[/{id}] — Administrator-only;
//   userUpdateBody { name?, email?, role? } with numeric roleLevel; PUT
//   refuses changing the caller's own role (SELF_ROLE_CHANGE) and demoting
//   the last administrator (LAST_ADMIN) (src/astro/routes/api/admin/users/
//   [id]/index.ts) — these native guards are why distinct-role fixture
//   support below is a two-account operation by design, never a self
//   role-switch; users are created only by the platform's authentication
//   flows (no REST user creation exists in 1.1.0)
// - POST/GET/DELETE /_emdash/api/admin/api-tokens — mint/list/revoke PATs
//   for the CALLING administrator only (no userId parameter)
// - GET /_emdash/api/auth/me → data { id, email, name, role, ... }
// - POST /_emdash/api/content/{collection} { data, slug?, status? "draft",
//   taxonomies?, references? } — authorId is set to the caller; 201 with the
//   created item; the native API create status is draft-only
//   (src/astro/routes/api/content/[collection]/index.ts,
//   src/api/schemas/content.ts contentCreateBody)
// - GET /_emdash/api/content/{collection}/{id} → data { item, _rev }
// - PUT  …/{id} { data?, references?, taxonomies?, slug?, _rev?,
//   overrideLock? } (body required)
// - POST …/{id}/publish   { publishedAt?, _rev?, overrideLock? } (optional
//   body; publishedAt additionally needs content:publish_any)
// - POST …/{id}/schedule  { scheduledAt, _rev?, overrideLock? } (body
//   required; ISO 8601 with Z or an explicit offset);
//   DELETE …/{id}/schedule unschedules
// - POST …/{id}/unpublish { _rev?, overrideLock? } (optional body)
// - DELETE …/{id} trash (content:delete_own/any; overrideLock rides the
//   query string), POST …/{id}/restore (no body),
//   DELETE …/{id}/permanent (content:delete_permanent — Administrator-only,
//   trash-first; no body)
// - GET …/{collection}/trash — native trash listing (content:read_drafts;
//   cursor pagination `cursor?`/`limit?` 1-100 default 50; response
//   data { items: [{ id, … }], nextCursor? })
//   (src/astro/routes/api/content/[collection]/trash.ts;
//   src/api/handlers/content.ts handleContentListTrashed). CRITICAL for
//   cleanup reconciliation: the ORDINARY content GET excludes soft-deleted
//   entries (src/database/repositories/content.ts findByIdOrSlug →
//   _findByIdOrSlug includeTrashed=false), so an ordinary 404 is NOT proof
//   of permanent deletion — an entry sitting in Trash 404s there while the
//   trash listing still shows it. Cleanup therefore reconciles uncertain
//   outcomes through the trash listing first (corrective round 2, finding 1)
// - POST /_emdash/api/media — multipart form field "file" (+ optional
//   deduplicate/ensureUniqueFilename/folderId/fieldId/width/height/thumbnail),
//   media:upload permission, response data { item: { id, ... } }.
//   CRITICAL for fixture ownership: the pinned 1.1.0 upload form parses
//   `deduplicate` with .default("true") (api/schemas/media.ts
//   mediaUploadDeduplicateForm), so an OMITTED flag makes an existing
//   content hash return the PRE-EXISTING item as { item, deduplicated: true }
//   (src/astro/routes/api/media.ts ~:217) — these helpers therefore send an
//   explicit deduplicate=false (every upload is a fresh owned fixture) and
//   would never register a deduplicated id as owned, so cleanup can never
//   delete an asset it did not create (T013 runtime observation: the
//   deterministic fixture bytes deduplicate onto the first upload otherwise)
// - GET/PUT/DELETE /_emdash/api/media/{id} — media:read;
//   media:edit_own + ownership (editors+ any); media:delete_own + ownership
//   (editors+ any)
//
// Boundaries (tasks.md shared constraints; Constitution v3.0.0 II–V):
// - development-only access: dev-bypass is used exactly as README §7
//   documents it; no production Passkey automation, no custom authentication
// - request boundary (corrective finding 6): every helper request is
//   confined to the configured origin's /_emdash/ native API — absolute,
//   protocol-relative, non-/_emdash/, and dot-escaping paths are rejected
//   before any transport (so no credential-bearing request can leave the
//   configured app), and redirects are refused rather than followed. This is
//   the bounded T002 request boundary, not a new authentication layer
// - no RBAC/impersonation abstraction: role fixtures use only the supported
//   native account/role operations above. An Administrator token is never
//   presented as coverage of another role — assertDistinctActors refuses the
//   shortcut and every role phase is verified live through /auth/me. Where
//   the environment lacks a second PAT-owning account (T001 §6 records that
//   standing truthfully), the calling tests must report the gap; these
//   helpers do not manufacture identities. A role mutation is reconciled on
//   every exit path: uncertain switch responses are re-read, and the
//   original role is restored and verified even when the identity check or
//   the callback fails (corrective finding 2)
// - no reference-management abstraction: `references`/`taxonomies` maps are
//   passed through in EmDash's native request shapes untouched
// - no schema operations and no synthetic official inventories: these
//   helpers only create/read/lifecycle content and clearly-marked synthetic
//   public-publishable media; Feature 002 schema/taxonomy work belongs to
//   its owning tasks
// - secrets (corrective findings 1/5): the dev-bypass PAT travels from the
//   native bootstrap response into the actor's private in-memory field
//   through an internal unredacted path that never appears in any returned
//   result; every externally reportable result, error message, non-JSON
//   body, and transport-failure message is scrubbed of embedded credential
//   strings (ec_pat_/ec_oat_ and "Bearer <token>" anywhere in a string) and
//   of the request's own supplied credential. CmsActor serializes to a
//   secret-free view; credential scratch loads fail closed below mode 0600
// - cleanup (corrective findings 3/4) is restricted to fixture IDs these
//   helpers themselves registered as owned (WeakMap registry). It never
//   throws past a failed step: each fixture is attempted independently,
//   uncertain/already-trashed outcomes are reconciled by re-reading state,
//   unresolved IDs REMAIN registered so a later cleanup can retry them, and
//   only proven-resolved IDs are dropped. A separate administrator actor may
//   supply the deletion authority while the owning actor's registry still
//   defines what may be touched. Volumes, real media, pre-existing data, and
//   anything unregistered are never touched
// - truthful outcomes: native validation/permission/conflict/uncertain
//   results are returned as { ok, status, body } results, never converted
//   into exceptions or false success; only helper preconditions (transport
//   failures, missing identity fields, failed precondition reads) throw
//   CmsHelperError with secret-free messages, and uncertain lifecycle
//   actions are re-read (currentRev) before any retry-oriented use
//
// These helpers perform no verification by themselves and claim nothing as
// PASS. They are consumed by the T003/T007/T019/T020/T021 spec files against
// the externally configured running development application
// (playwright.config.ts contract: PLAYWRIGHT_BASE_URL or the documented
// http://localhost:4321 origin). Runtime prerequisites the environment does
// not provide (per T001 §3–§7) remain the calling tests' truthful skips.

// ---------------------------------------------------------------------------
// Constants and small shared types
// ---------------------------------------------------------------------------

/** Documented development origin (README §6; playwright.config.ts default). */
export const DEFAULT_DEVELOPMENT_ORIGIN = "http://localhost:4321";

/** The native API root every helper request must stay inside. */
const NATIVE_API_ROOT = "/_emdash/";

/** Marker embedded in synthetic fixture titles/slugs by the calling tests. */
export const SYNTHETIC_FIXTURE_MARK = "songhealth-f002-synthetic";

/** Prefix for synthetic slugs minted by createSyntheticEntry. */
const SYNTHETIC_SLUG_PREFIX = `${SYNTHETIC_FIXTURE_MARK}-`;

/**
 * Native EmDash role levels (docs.emdashcms.com "User roles"; pinned 1.1.0
 * source uses the same numeric levels with ROLE_ADMIN = 50).
 */
export const NATIVE_ROLES = {
	subscriber: 10,
	contributor: 20,
	author: 30,
	editor: 40,
	administrator: 50,
} as const;

export type NativeRoleLevel = (typeof NATIVE_ROLES)[keyof typeof NATIVE_ROLES];

/** Human-readable name of a native role level, or "role:<level>". */
export function nativeRoleName(level: number): string {
	const match = Object.entries(NATIVE_ROLES).find(([, value]) => value === level);
	return match ? match[0] : `role:${level}`;
}

/**
 * Error thrown for helper precondition failures only (transport errors,
 * missing identity fields, failed precondition reads, unsafe secret scratch,
 * rejected request targets). Native API refusals are NEVER thrown — they are
 * returned as results so tests report them truthfully. Messages are
 * secret-free by construction (scrubbed at every creation site).
 */
export class CmsHelperError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`[${code}] ${scrubEmbeddedSecrets(message)}`);
		this.name = "CmsHelperError";
		this.code = code;
	}
}

// ---------------------------------------------------------------------------
// Secret redaction (Constitution IV: secrets stay outside evidence/reports)
// ---------------------------------------------------------------------------

const SECRET_KEY_PATTERN = /^(authorization|token|password|secret|pat)$/i;
const SECRET_VALUE_PATTERN = /^ec_(pat|oat)_/;
const REDACTED = "[redacted]";

/**
 * Credential-shaped substrings ANYWHERE inside a string. Word-boundary safe:
 * requires the native ec_pat_/ec_oat_ prefix or a "Bearer <long token>"
 * header shape, so ordinary prose fields (e.g. a title saying "Bearer of …")
 * are not corrupted (corrective finding 5).
 */
const EMBEDDED_SECRET_PATTERN =
	/ec_(?:pat|oat)_[A-Za-z0-9][A-Za-z0-9_-]*|Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi;

/** Replace credential-shaped substrings (and any supplied secret) in text. */
export function scrubEmbeddedSecrets(text: string, secrets: readonly string[] = []): string {
	let out = text.replaceAll(EMBEDDED_SECRET_PATTERN, REDACTED);
	for (const secret of secrets) {
		if (secret.length >= 8) {
			out = out.split(secret).join(REDACTED);
		}
	}
	return out;
}

/**
 * Anything that looks like a native credential string as a whole value: a
 * PAT/OAT token, or a full Authorization header value whose bearer token is
 * credential-shaped (12+ token characters — ordinary prose such as a title
 * reading "Bearer of …" is not).
 */
export function isSecretLike(value: string): boolean {
	return SECRET_VALUE_PATTERN.test(value) || /^Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i.test(value);
}

/**
 * Deep, cycle-safe copy of `value` in which secret-looking values, embedded
 * credential substrings, well-known secret-bearing keys, and any explicitly
 * supplied secret material are replaced. Every native result returned by
 * these helpers passes through this once, so evidence built from results —
 * including native error messages and non-JSON bodies — cannot carry
 * credentials by accident.
 */
export function redactSecrets<T>(value: T, secrets: readonly string[] = []): T {
	return redactWalk(value, secrets, new WeakSet<object>());
}

function redactWalk<T>(value: T, secrets: readonly string[], seen: WeakSet<object>): T {
	if (typeof value === "string") {
		return (isSecretLike(value) ? REDACTED : scrubEmbeddedSecrets(value, secrets)) as unknown as T;
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	const source = value as unknown as object;
	if (seen.has(source)) {
		return "[circular]" as unknown as T;
	}
	seen.add(source);
	if (Array.isArray(source)) {
		return source.map((entry) => redactWalk(entry, secrets, seen)) as unknown as T;
	}
	const copy: Record<string, unknown> = {};
	for (const key of Object.keys(source)) {
		const entry = (source as Record<string, unknown>)[key];
		copy[key] =
			typeof entry === "string" && SECRET_KEY_PATTERN.test(key)
				? REDACTED
				: redactWalk(entry, secrets, seen);
	}
	return copy as unknown as T;
}

/**
 * Read one credential from an ignored mode-0600 scratch file (quickstart
 * "Prerequisites": token scratch lives under e.g. .tmp/feature002/). Fails
 * closed on any looser mode, a non-regular file, or multi-line content —
 * the credential is returned into memory only.
 *
 * node:fs is loaded through a dynamic non-literal import because the pinned
 * dependency baseline intentionally ships no @types/node (tests/browser and
 * tests/node run under Node's own TypeScript support, like the existing
 * tests/node suites); the structural cast keeps this file strict-typed.
 */
export async function readSecretScratch(path: string): Promise<string> {
	const specifier = "node:fs/promises";
	const fsPromises = (await import(specifier)) as unknown as {
		stat: (p: string) => Promise<{ mode: number; isFile(): boolean }>;
		readFile: (p: string, encoding: "utf8") => Promise<string>;
	};
	const stats = await fsPromises.stat(path);
	if (!stats.isFile()) {
		throw new CmsHelperError("SECRET_SCRATCH_INVALID", `${path} is not a regular file`);
	}
	if ((stats.mode & 0o777) !== 0o600) {
		throw new CmsHelperError(
			"SECRET_SCRATCH_INVALID",
			`refusing to read ${path}: credential scratch must be mode 0600 (git-ignored), never group/world readable`,
		);
	}
	const raw = await fsPromises.readFile(path, "utf8");
	const credential = raw.trim();
	if (credential.length === 0 || credential.includes("\n")) {
		throw new CmsHelperError("SECRET_SCRATCH_INVALID", `${path} must hold exactly one credential`);
	}
	return credential;
}

/**
 * Environment variable naming the existing Songhealth development credential
 * (controller-format JSON `{ token, source }`) for the PAT-based suites. The
 * path is configuration, never a source constant (Constitution III).
 */
export const DEV_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_DEV_ACCESS";

/**
 * Load the existing Songhealth development credential's PAT from its
 * controller-format JSON file into memory only (T013 test-authentication
 * adaptation: the suites consume the pre-existing development credential
 * instead of re-running the seed-applying dev-bypass bootstrap, which would
 * replace same-named tokens and reapply seed intent on every run). The file
 * must be a regular, non-symlink, mode-0600 file — the same fail-closed
 * discipline as readSecretScratch. The JSON is parsed in memory; the token is
 * returned to the caller and never logged, hashed, or rewritten.
 *
 * Path resolution: the explicit argument, else DEV_ACCESS_CREDENTIAL_ENV.
 * node:fs is loaded through a dynamic non-literal import because the pinned
 * dependency baseline intentionally ships no @types/node.
 */
export async function loadDevAccessToken(path?: string): Promise<string> {
	const processSpecifier = "node:process";
	const nodeProcess = (await import(processSpecifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	const fsSpecifier = "node:fs/promises";
	const fsPromises = (await import(fsSpecifier)) as unknown as {
		lstat: (p: string) => Promise<{ isFile(): boolean; isSymbolicLink(): boolean; mode: number }>;
		readFile: (p: string, encoding: "utf8") => Promise<string>;
	};
	const resolved = path ?? nodeProcess.env[DEV_ACCESS_CREDENTIAL_ENV];
	if (resolved === undefined || resolved.trim().length === 0) {
		throw new CmsHelperError(
			"DEV_ACCESS_PATH_MISSING",
			`no development credential path: pass one or set ${DEV_ACCESS_CREDENTIAL_ENV}`,
		);
	}
	const stats = await fsPromises.lstat(resolved);
	if (!stats.isFile() || stats.isSymbolicLink()) {
		throw new CmsHelperError("DEV_ACCESS_INVALID", `${resolved} is not a regular non-symlink file`);
	}
	if ((stats.mode & 0o777) !== 0o600) {
		throw new CmsHelperError(
			"DEV_ACCESS_INVALID",
			`refusing to read ${resolved}: the development credential must be mode 0600, never group/world readable`,
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(await fsPromises.readFile(resolved, "utf8"));
	} catch {
		throw new CmsHelperError("DEV_ACCESS_INVALID", `${resolved} is not valid JSON`);
	}
	const token =
		parsed !== null && typeof parsed === "object"
			? (parsed as Record<string, unknown>).token
			: undefined;
	if (typeof token !== "string" || token.trim().length === 0) {
		throw new CmsHelperError("DEV_ACCESS_INVALID", `${resolved} carries no non-empty string token field`);
	}
	return token;
}

// ---------------------------------------------------------------------------
// Native result envelope
// ---------------------------------------------------------------------------

export interface NativeErrorShape {
	code: string;
	message: string;
	details?: unknown;
}

/**
 * A completed native request. `ok` is the HTTP-level truth; `body` is the
 * parsed, already-redacted native envelope (`{ success, data }` or
 * `{ success, error }`). Refusals are data, not exceptions.
 */
export interface NativeResult {
	ok: boolean;
	status: number;
	body: unknown;
}

function nativeEnvelopeOf(result: NativeResult): Record<string, unknown> | undefined {
	if (result.body !== null && typeof result.body === "object") {
		return result.body as Record<string, unknown>;
	}
	return undefined;
}

/** The native envelope's `data` object, when present. */
export function nativeDataOf(result: NativeResult): Record<string, unknown> | undefined {
	const envelope = nativeEnvelopeOf(result);
	const data = envelope?.data;
	if (data !== null && typeof data === "object") {
		return data as Record<string, unknown>;
	}
	return undefined;
}

/** The native envelope's `error` object, when present. */
export function nativeErrorOf(result: NativeResult): NativeErrorShape | undefined {
	const envelope = nativeEnvelopeOf(result);
	const error = envelope?.error;
	if (error !== null && typeof error === "object") {
		return error as NativeErrorShape;
	}
	return undefined;
}

/** Compact non-secret refusal summary ("<status> <code>") for reports. */
export function nativeRefusalOf(result: NativeResult): string {
	const error = nativeErrorOf(result);
	return error ? `${result.status} ${error.code}` : `${result.status}`;
}

/** The content item object of a read/create result (`data.item`). */
export function nativeItemOf(result: NativeResult): Record<string, unknown> | undefined {
	const data = nativeDataOf(result);
	const item = data?.item;
	if (item !== null && typeof item === "object") {
		return item as Record<string, unknown>;
	}
	return undefined;
}

/** The opaque `_rev` of a read result (`data._rev` or `data.item._rev`). */
export function nativeRevOf(result: NativeResult): string | undefined {
	const data = nativeDataOf(result);
	if (typeof data?._rev === "string") return data._rev;
	const item = nativeItemOf(result);
	if (typeof item?._rev === "string") return item._rev;
	return undefined;
}

/** The items array of a list result (`data.items` or a bare data array). */
export function nativeItemsOf(result: NativeResult): unknown[] {
	const data = nativeDataOf(result);
	if (Array.isArray(data?.items)) return data.items;
	if (Array.isArray(data)) return data;
	return [];
}

function requireString(value: unknown, what: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new CmsHelperError("NATIVE_SHAPE_UNEXPECTED", `native response lacked ${what}`);
	}
	return value;
}

/** Narrow an unknown native value to a plain record (empty when not one). */
function recordOf(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

/**
 * Secret-free rendering of an arbitrary caught failure for reports. Known
 * supplied secrets (the acting credentials) are scrubbed too, so a failure
 * message echoing a non-pattern-shaped credential cannot leak into a
 * report or a thrown helper error (corrective round 2, finding 2).
 */
function failureText(cause: unknown, secrets: readonly string[] = []): string {
	const message = cause instanceof Error ? cause.message : String(cause);
	return scrubEmbeddedSecrets(message, secrets);
}

// ---------------------------------------------------------------------------
// Actor context (bearer credential stays in memory, never serialized)
// ---------------------------------------------------------------------------

export interface NativeActorView {
	baseUrl: string;
	userId: string;
	email: string;
	name: string;
	role: number;
	roleName: string;
}

interface OwnedFixtureRegistry {
	entries: Array<{ collection: string; id: string }>;
	media: string[];
}

const ownedFixtures = new WeakMap<CmsActor, OwnedFixtureRegistry>();

function registryOf(actor: CmsActor): OwnedFixtureRegistry {
	let registry = ownedFixtures.get(actor);
	if (!registry) {
		registry = { entries: [], media: [] };
		ownedFixtures.set(actor, registry);
	}
	return registry;
}

/**
 * An authenticated native API actor. The bearer credential is held in a
 * private field; JSON serialization yields the secret-free view only.
 */
export class CmsActor {
	readonly baseUrl: string;
	readonly userId: string;
	readonly email: string;
	readonly name: string;
	readonly role: number;
	#token: string;

	constructor(view: Omit<NativeActorView, "roleName">, token: string) {
		this.baseUrl = view.baseUrl.replace(/\/+$/, "");
		this.userId = view.userId;
		this.email = view.email;
		this.name = view.name;
		this.role = view.role;
		this.#token = token;
	}

	/** Secret-free identity view (safe for evidence and reports). */
	describe(): NativeActorView {
		return {
			baseUrl: this.baseUrl,
			userId: this.userId,
			email: this.email,
			name: this.name,
			role: this.role,
			roleName: nativeRoleName(this.role),
		};
	}

	/** Accidental serialization (log lines, JSON.stringify) stays redacted. */
	toJSON(): NativeActorView {
		return this.describe();
	}

	/** Authorization header value — internal to these helpers' requests. */
	bearerValue(): string {
		return `Bearer ${this.#token}`;
	}

	/**
	 * The bare credential, so failure rendering for requests made through
	 * this actor can scrub the actor's own secret even when it is not
	 * credential-pattern-shaped (corrective round 2, finding 2). Internal to
	 * these helpers' scrubbing paths; never returned in any result.
	 */
	knownSecret(): string {
		return this.#token;
	}
}

/** Secret-free identity view of an actor (alias of CmsActor#describe). */
export function describeActor(actor: CmsActor): NativeActorView {
	return actor.describe();
}

/** Counts of owned synthetic fixtures currently registered for an actor. */
export function ownedFixtureCounts(actor: CmsActor): { entries: number; media: number } {
	const registry = registryOf(actor);
	return { entries: registry.entries.length, media: registry.media.length };
}

// ---------------------------------------------------------------------------
// Request core — confined to the configured origin's native API
// ---------------------------------------------------------------------------

export interface CmsRequestOptions {
	method?: string;
	/** JSON request body (serialized with content-type application/json). */
	body?: unknown;
	/** Multipart request body (media uploads). */
	form?: FormData;
	/** Query-string parameters. */
	searchParams?: Record<string, string>;
}

/**
 * Internal request outcome: `body` is already redacted for reporting, while
 * `rawBody` is the unredicated parse used ONLY in-module to carry the
 * dev-bypass bootstrap credential from the native response into the actor's
 * private field (corrective finding 1). rawBody never leaves this module.
 */
interface RawNativeResult {
	ok: boolean;
	status: number;
	body: unknown;
	rawBody: unknown;
}

/**
 * Perform one native API request. `authorization` is null only for the
 * unauthenticated development bootstrap path. The target is validated
 * against the configured origin BEFORE any transport (corrective finding 6):
 * only same-origin /_emdash/ paths are accepted, and redirects are refused.
 * Native refusals (4xx/5xx) are returned as results; only transport failures
 * throw, with scrubbed messages (a credential travels solely in the
 * Authorization header, and any echo of it in an error is scrubbed).
 */
async function rawRequest(
	baseUrl: string,
	path: string,
	authorization: string | null,
	options: CmsRequestOptions,
): Promise<RawNativeResult> {
	if (typeof path !== "string" || !path.startsWith(NATIVE_API_ROOT)) {
		// Also rejects absolute URLs and protocol-relative "//host/…" forms.
		throw new CmsHelperError(
			"REQUEST_PATH_REJECTED",
			`refusing ${String(path)}: helper requests must target the configured app's ${NATIVE_API_ROOT} native API only`,
		);
	}
	const configuredOrigin = new URL(baseUrl).origin;
	const url = new URL(path, `${baseUrl.replace(/\/+$/, "")}/`);
	if (url.origin !== configuredOrigin || !url.pathname.startsWith(NATIVE_API_ROOT)) {
		throw new CmsHelperError(
			"REQUEST_PATH_REJECTED",
			`refusing ${url.origin}${url.pathname}: the resolved target must stay on the configured origin ${configuredOrigin} under ${NATIVE_API_ROOT}`,
		);
	}
	const secrets: string[] = [];
	if (authorization !== null) {
		secrets.push(authorization.replace(/^Bearer\s+/i, ""));
	}
	for (const [key, value] of Object.entries(options.searchParams ?? {})) {
		url.searchParams.set(key, value);
	}
	const headers: Record<string, string> = {};
	if (authorization !== null) {
		headers.Authorization = authorization;
	}
	let body: BodyInit | undefined;
	if (options.form !== undefined) {
		body = options.form;
	} else if (options.body !== undefined) {
		headers["Content-Type"] = "application/json";
		body = JSON.stringify(options.body);
	}
	let response: Response;
	try {
		response = await fetch(url, {
			method: options.method ?? "GET",
			headers,
			body,
			// No native endpoint in this helper set redirects; following one
			// could carry the Authorization header off-origin, so a redirect
			// is an error rather than a followed hop.
			redirect: "error",
		});
	} catch (cause) {
		const reason = failureText(cause);
		throw new CmsHelperError(
			"REQUEST_TRANSPORT",
			`${options.method ?? "GET"} ${path} failed to reach the configured development app: ${scrubEmbeddedSecrets(reason, secrets)}`,
		);
	}
	let text: string;
	try {
		text = await response.text();
	} catch (cause) {
		// A body-read rejection can carry request material (including the
		// supplied credential) in its message — scrub it with this request's
		// known secrets, not just the credential patterns (finding 2).
		throw new CmsHelperError(
			"RESPONSE_BODY_READ_FAILED",
			`${options.method ?? "GET"} ${path} returned status ${response.status} but its body could not be read: ${failureText(cause, secrets)}`,
		);
	}
	let parsed: unknown;
	try {
		parsed = text.length > 0 ? JSON.parse(text) : undefined;
	} catch {
		parsed = { nonJsonBody: text };
	}
	return {
		ok: response.ok,
		status: response.status,
		body: redactSecrets(parsed, secrets),
		rawBody: parsed,
	};
}

/**
 * Perform one authenticated native API request for an actor. Native
 * refusals (4xx/5xx) are returned as results, never thrown.
 */
export async function cmsRequest(
	actor: CmsActor,
	path: string,
	options: CmsRequestOptions = {},
): Promise<NativeResult> {
	const raw = await rawRequest(actor.baseUrl, path, actor.bearerValue(), options);
	return { ok: raw.ok, status: raw.status, body: raw.body };
}

function baseUrlOrDefault(baseUrl?: string): string {
	if (baseUrl !== undefined) {
		return baseUrl;
	}
	// Mirrors playwright.config.ts: the suite is pointed at the configured
	// origin by its runner; helpers default to the documented dev origin.
	return DEFAULT_DEVELOPMENT_ORIGIN;
}

// ---------------------------------------------------------------------------
// Development access (README §7 native dev bypass — development builds only)
// ---------------------------------------------------------------------------

export interface DevBypassOptions {
	baseUrl?: string;
	/**
	 * Skip the post-bootstrap /auth/me identity check. Not recommended: the
	 * self-check is what proves the minted credential is live and distinct.
	 */
	skipSelfCheck?: boolean;
}

/**
 * Bootstrap the development-only native access path documented in README §7:
 * POST /_emdash/api/setup/dev-bypass?token=1. In a production build the
 * endpoint answers 403 and this helper fails with DEV_BYPASS_FORBIDDEN —
 * that boundary is the platform's, and it is reported, not worked around.
 *
 * The minted PAT is read from the unredacted internal parse of the bootstrap
 * response and exists only in the actor's private in-memory field
 * (corrective finding 1): every result these helpers ever returns is
 * redacted, but the credential itself must survive its trip into the actor.
 * The follow-up /auth/me self-check proves the real credential is live.
 */
export async function createDevBypassActor(options: DevBypassOptions = {}): Promise<CmsActor> {
	// Unauthenticated by design: this IS the development bootstrap.
	const raw = await rawRequest(
		baseUrlOrDefault(options.baseUrl),
		"/_emdash/api/setup/dev-bypass",
		null,
		{ method: "POST", searchParams: { token: "1" } },
	);
	const result: NativeResult = { ok: raw.ok, status: raw.status, body: raw.body };
	if (raw.status === 403) {
		throw new CmsHelperError(
			"DEV_BYPASS_FORBIDDEN",
			"the configured app refused dev-bypass (403): the native bootstrap is available in development builds only (README §7); no production authentication is attempted",
		);
	}
	if (!raw.ok) {
		throw new CmsHelperError(
			"DEV_BYPASS_FAILED",
			`dev-bypass bootstrap failed: ${nativeRefusalOf(result)}`,
		);
	}
	// Transient unredacted view, in-scope only, consumed immediately for the
	// credential; nothing below returns it.
	const rawData =
		raw.rawBody !== null && typeof raw.rawBody === "object"
			? ((raw.rawBody as Record<string, unknown>).data ?? {}) as Record<string, unknown>
			: {};
	const token = requireString(rawData.token, "the minted PAT (only present with ?token=1)");
	const user = recordOf(rawData.user);
	const actor = new CmsActor(
		{
			baseUrl: baseUrlOrDefault(options.baseUrl),
			userId: requireString(user.id, "dev user id"),
			email: requireString(user.email, "dev user email"),
			name: typeof user.name === "string" ? user.name : "",
			role: Number(user.role),
		},
		token,
	);
	if (!options.skipSelfCheck) {
		const me = await getMe(actor);
		const identity = nativeDataOf(me);
		if (!me.ok || identity?.id !== actor.userId) {
			throw new CmsHelperError(
				"DEV_BYPASS_IDENTITY_UNVERIFIED",
				`the minted credential did not verify as the bootstrap user via /_emdash/api/auth/me (${nativeRefusalOf(me)})`,
			);
		}
	}
	return actor;
}

// ---------------------------------------------------------------------------
// Supplied-credential actors and identity verification
// ---------------------------------------------------------------------------

export interface PatActorOptions {
	baseUrl?: string;
	/** Raw PAT value (in memory) — e.g. loaded via readSecretScratch. */
	token: string;
	/** Optional identity expectations verified against /auth/me. */
	expected?: { userId?: string; role?: NativeRoleLevel };
}

/**
 * Wrap a caller-supplied native PAT and verify its live identity through
 * GET /_emdash/api/auth/me before use. Distinct-role fixtures rely on this:
 * each role's coverage comes from a credential that verifiably belongs to a
 * distinct native account at the expected role — an Administrator token
 * never stands in (see assertDistinctActors).
 */
export async function createPatActor(options: PatActorOptions): Promise<CmsActor> {
	if (options.token.trim().length === 0) {
		throw new CmsHelperError("PAT_MISSING", "no credential value was supplied");
	}
	const actor = new CmsActor(
		{
			baseUrl: baseUrlOrDefault(options.baseUrl),
			userId: "unverified",
			email: "unverified",
			name: "unverified",
			role: Number.NaN,
		},
		options.token.trim(),
	);
	const me = await getMe(actor);
	const identity = nativeDataOf(me);
	if (!me.ok || identity === undefined) {
		throw new CmsHelperError(
			"PAT_INVALID",
			`the supplied credential did not authenticate via /_emdash/api/auth/me (${nativeRefusalOf(me)}); no credential material is echoed`,
		);
	}
	const verified = new CmsActor(
		{
			baseUrl: actor.baseUrl,
			userId: requireString(identity.id, "the verified user id"),
			email: requireString(identity.email, "the verified user email"),
			name: typeof identity.name === "string" ? identity.name : "",
			role: Number(identity.role),
		},
		options.token.trim(),
	);
	if (
		options.expected?.userId !== undefined &&
		options.expected.userId !== verified.userId
	) {
		throw new CmsHelperError(
			"IDENTITY_MISMATCH",
			`the supplied credential belongs to user ${verified.userId}, not the expected ${options.expected.userId}`,
		);
	}
	if (options.expected?.role !== undefined && options.expected.role !== verified.role) {
		throw new CmsHelperError(
			"IDENTITY_MISMATCH",
			`the supplied credential acts at native role ${nativeRoleName(verified.role)} (${verified.role}), not the expected ${nativeRoleName(options.expected.role)} (${options.expected.role})`,
		);
	}
	return verified;
}

/**
 * Refuse the Administrator-token shortcut: role coverage requires actors on
 * distinct native accounts (tasks.md: "an Admin token alone cannot prove
 * draft-only refusal or own/others boundaries").
 */
export function assertDistinctActors(a: CmsActor, b: CmsActor): void {
	if (a.userId === b.userId) {
		throw new CmsHelperError(
			"NOT_DISTINCT_ACTORS",
			`both credentials belong to native account ${a.userId}; distinct-role coverage requires distinct native accounts (an Administrator token cannot stand in for role coverage)`,
		);
	}
}

/**
 * Refuse cross-application actor pairs (corrective round 2, finding 3): an
 * actor operating on another actor's registered fixture IDs — an
 * administrative cleanup executor or a role-phase orchestrator — must
 * identify the SAME configured native application (scheme+host+port) as the
 * owning actor, or its native requests would hit a different app with IDs
 * minted by this one. Checked before any request is made. This is a
 * configuration-boundary check between two supplied actors, not a new
 * authentication or RBAC layer.
 */
export function assertSameNativeApp(a: CmsActor, b: CmsActor): void {
	const originA = new URL(a.baseUrl).origin;
	const originB = new URL(b.baseUrl).origin;
	if (originA !== originB) {
		throw new CmsHelperError(
			"ACTOR_ORIGIN_MISMATCH",
			`the supplied actors identify different native applications (${originA} versus ${originB}); an actor operating on another actor's fixtures must be configured for the same application — refusing before any request`,
		);
	}
}

/** GET /_emdash/api/auth/me — live identity/role of the actor. */
export async function getMe(actor: CmsActor): Promise<NativeResult> {
	return cmsRequest(actor, "/_emdash/api/auth/me");
}

// ---------------------------------------------------------------------------
// Supported native account/role operations (Administrator orchestrator)
// ---------------------------------------------------------------------------

export interface ListUsersOptions {
	search?: string;
	role?: string;
	cursor?: string;
	limit?: number;
}

/** GET /_emdash/api/admin/users — Administrator-only user listing. */
export async function listUsers(admin: CmsActor, options: ListUsersOptions = {}): Promise<NativeResult> {
	const searchParams: Record<string, string> = {};
	if (options.search !== undefined) searchParams.search = options.search;
	if (options.role !== undefined) searchParams.role = options.role;
	if (options.cursor !== undefined) searchParams.cursor = options.cursor;
	if (options.limit !== undefined) searchParams.limit = String(options.limit);
	return cmsRequest(admin, "/_emdash/api/admin/users", { searchParams });
}

/** GET /_emdash/api/admin/users/{id} — user details including current role. */
export async function getUser(admin: CmsActor, userId: string): Promise<NativeResult> {
	return cmsRequest(admin, `/_emdash/api/admin/users/${encodeURIComponent(userId)}`);
}

/**
 * PUT /_emdash/api/admin/users/{id} — the supported native role operation:
 * set another account's role level. The platform itself refuses changing
 * your own role (SELF_ROLE_CHANGE) and demoting the last administrator
 * (LAST_ADMIN); those refusals are returned as truthful results and never
 * worked around here.
 */
export async function setUserRole(
	admin: CmsActor,
	userId: string,
	role: NativeRoleLevel,
): Promise<NativeResult> {
	return cmsRequest(admin, `/_emdash/api/admin/users/${encodeURIComponent(userId)}`, {
		method: "PUT",
		body: { role },
	});
}

function userRoleOf(result: NativeResult): number | undefined {
	const role = nativeItemOf(result)?.role;
	return typeof role === "number" ? role : undefined;
}

/** Compact role state for truthful restore reporting. */
function roleStateText(adminObserved: number | undefined, liveObserved: unknown): string {
	return `admin-read=${adminObserved === undefined ? "unknown" : nativeRoleName(adminObserved)}; live-credential-read=${typeof liveObserved === "number" ? nativeRoleName(liveObserved) : String(liveObserved)}`;
}

/**
 * Run `fn` while the fixture actor's native account holds `role`.
 *
 * Supported-operation shape, pinned by the 1.1.0 guards: the orchestrator
 * (an Administrator on a DIFFERENT account — assertDistinctActors enforces
 * it, and the platform's SELF_ROLE_CHANGE guard would refuse otherwise)
 * sets the fixture account's role via the users API; the fixture actor's
 * credential acts at that role because the auth middleware re-reads its
 * user record on every request. This is not an impersonation layer:
 * nothing forges identity, mints roles, or bypasses a permission check;
 * each phase exercises the real native permission decisions.
 *
 * Failure-path contract (corrective findings 2 and round-3 finding 1):
 * after a possibly-committed role mutation, EVERY exit path reconciles and
 * restores. The switch response is uncertain-safe (a refusal or transport
 * failure is re-read before the mutation is considered not-committed); the
 * live /auth/me identity check and the callback each run only when the
 * switch is verified; and restoration — restore request, admin re-read, and
 * live credential re-read — is awaited and verified on every path,
 * including switch-uncertain, identity-failure, and callback-failure. The
 * original role is reported restored only when that verification observed
 * it; otherwise the unresolved restoration is reported loudly and, when
 * both occur, combined with the preserved original failure evidence. A
 * rejected callback is always reported as a failure (including rejections
 * with `undefined`) and only ever surfaces as a CmsHelperError carrying a
 * scrubbed rendering of the rejected value — the raw cause object is never
 * rethrown, so its message/stack cannot leak credential material.
 */
export async function withNativeRole<T>(
	admin: CmsActor,
	actor: CmsActor,
	role: NativeRoleLevel,
	fn: (actor: CmsActor) => Promise<T>,
): Promise<T> {
	assertDistinctActors(admin, actor);
	// The orchestrator mutates the fixture account through ITS configured
	// app; both actors must therefore identify the same native application.
	assertSameNativeApp(admin, actor);
	const scrubSecrets = [admin.knownSecret(), actor.knownSecret()];
	const before = await getUser(admin, actor.userId);
	const originalRole = userRoleOf(before);
	if (!before.ok || originalRole === undefined) {
		throw new CmsHelperError(
			"ROLE_PRECONDITION_FAILED",
			`could not read the current role of fixture account ${actor.userId}: ${nativeRefusalOf(before)}`,
		);
	}
	// The native record carries a numeric role level; restore through the
	// same supported operation regardless of whether it is a known level.
	const originalRoleLevel = originalRole as NativeRoleLevel;

	/**
	 * Reconcile the fixture account back to its original role. Never throws:
	 * returns null when the account is VERIFIED back at its original role
	 * (through both the admin read and the live credential read), or a
	 * truthful error describing what was observed. Uncertain outcomes are
	 * re-read before acting ("re-read uncertain actions before retry").
	 */
	const reconcileOriginalRole = async (): Promise<CmsHelperError | null> => {
		try {
			const current = await getUser(admin, actor.userId);
			const currentRole = userRoleOf(current);
			if (!current.ok) {
				return new CmsHelperError(
					"ROLE_RESTORE_UNVERIFIED",
					`could not re-read the role of fixture account ${actor.userId} after mutation (${nativeRefusalOf(current)}); restoration state unknown`,
				);
			}
			if (currentRole === originalRole) {
				return null;
			}
			const restore = await setUserRole(admin, actor.userId, originalRoleLevel);
			if (!restore.ok) {
				return new CmsHelperError(
					"ROLE_RESTORE_FAILED",
					`native role operation refused to restore ${nativeRoleName(originalRole)} for account ${actor.userId} (observed ${currentRole === undefined ? "unknown" : nativeRoleName(currentRole)}): ${nativeRefusalOf(restore)}`,
				);
			}
			const afterAdmin = await getUser(admin, actor.userId);
			const afterLive = await getMe(actor);
			const adminRole = userRoleOf(afterAdmin);
			const liveRole = nativeDataOf(afterLive)?.role;
			if (!afterAdmin.ok || adminRole !== originalRole || !afterLive.ok || liveRole !== originalRole) {
				return new CmsHelperError(
					"ROLE_RESTORE_UNVERIFIED",
					`restoration of ${nativeRoleName(originalRole)} for account ${actor.userId} was requested but not verified (${roleStateText(adminRole, afterLive.ok ? liveRole : nativeRefusalOf(afterLive))})`,
				);
			}
			return null;
		} catch (cause) {
			return new CmsHelperError(
				"ROLE_RESTORE_UNVERIFIED",
				`restoration attempt for account ${actor.userId} failed: ${failureText(cause, scrubSecrets)}`,
			);
		}
	};

	// Phase 1 — request the mutation; classify commit state truthfully.
	let phaseError: unknown;
	let mutated: "no" | "yes" | "uncertain" = "no";
	try {
		const switchResult = await setUserRole(admin, actor.userId, role);
		if (switchResult.ok && userRoleOf(switchResult) === role) {
			mutated = "yes";
		} else {
			// The response refused or disagreed — re-read before deciding
			// whether the mutation nevertheless committed.
			const actual = await getUser(admin, actor.userId);
			const actualRole = userRoleOf(actual);
			if (actual.ok && actualRole === originalRole) {
				mutated = "no";
				phaseError = new CmsHelperError(
					"ROLE_SWITCH_REFUSED",
					`native role operation refused to set ${nativeRoleName(role)} for account ${actor.userId} and re-read confirmed the role unchanged: ${nativeRefusalOf(switchResult)}`,
				);
			} else if (actual.ok && actualRole === role) {
				mutated = "yes";
			} else {
				mutated = "uncertain";
				phaseError = new CmsHelperError(
					"ROLE_SWITCH_UNCERTAIN",
					`role switch to ${nativeRoleName(role)} for account ${actor.userId} returned ${nativeRefusalOf(switchResult)} and the re-read could not confirm the original role (${actual.ok ? `observed ${actualRole === undefined ? "unknown" : nativeRoleName(actualRole)}` : nativeRefusalOf(actual)})`,
				);
			}
		}
	} catch (cause) {
		mutated = "uncertain";
		phaseError = new CmsHelperError(
			"ROLE_SWITCH_UNCERTAIN",
			`role switch request for account ${actor.userId} failed before its outcome was known: ${failureText(cause, scrubSecrets)}`,
		);
	}

	// Phase 2 — verify the live credential actually acts at the target role.
	if (mutated === "yes" && phaseError === undefined) {
		try {
			const liveMe = await getMe(actor);
			const liveRole = nativeDataOf(liveMe)?.role;
			if (!liveMe.ok || liveRole !== role) {
				phaseError = new CmsHelperError(
					"ROLE_SWITCH_UNVERIFIED",
					`fixture credential did not verify at role ${nativeRoleName(role)} via /_emdash/api/auth/me (${liveMe.ok ? `observed ${String(liveRole)}` : nativeRefusalOf(liveMe)})`,
				);
			}
		} catch (cause) {
			phaseError = new CmsHelperError(
				"ROLE_SWITCH_UNVERIFIED",
				`live identity check failed after the role mutation: ${failureText(cause, scrubSecrets)}`,
			);
		}
	}

	// Phase 3 — the caller's role-phase callback. A rejection is tracked by
	// OCCURRENCE, separate from its value: even a rejection with `undefined`
	// is a real failure (corrective round 3, finding 1), and the raw
	// rejected value is never rethrown as-is — its message/stack could carry
	// unsanitized credential material, so only a scrubbed rendering of it
	// ever leaves this function.
	let value: T | undefined;
	let callbackFailed = false;
	let callbackFailure: unknown;
	if (mutated === "yes" && phaseError === undefined) {
		try {
			value = await fn(actor);
		} catch (cause) {
			callbackFailed = true;
			callbackFailure = cause;
		}
	}

	// Phase 4 — reconcile on every path that may have mutated. Only a
	// re-read-confirmed original role (mutated === "no") skips this safely.
	if (mutated !== "no") {
		const restoreError = await reconcileOriginalRole();
		if (restoreError !== null) {
			if (phaseError !== undefined || callbackFailed) {
				const earlierFailure = phaseError !== undefined ? phaseError : callbackFailure;
				throw new CmsHelperError(
					"ROLE_AND_RESTORE_FAILED",
					`${restoreError.message}; the earlier failure was: ${failureText(earlierFailure, scrubSecrets)}`,
				);
			}
			throw restoreError;
		}
	}
	if (phaseError !== undefined) {
		throw phaseError;
	}
	if (callbackFailed) {
		// Truthful, redacted reporting of the rejected callback: the
		// scrubbed message preserves the non-secret failure evidence without
		// exposing the original cause object or its stack.
		throw new CmsHelperError(
			"CALLBACK_FAILED",
			`the role-phase callback rejected: ${failureText(callbackFailure, scrubSecrets)}`,
		);
	}
	if (mutated !== "yes") {
		// Defensive: no phase error was recorded but the switch never
		// verified — report truthfully instead of running the callback.
		throw new CmsHelperError(
			"ROLE_SWITCH_UNVERIFIED",
			`role phase did not run for account ${actor.userId} (mutation state: ${mutated})`,
		);
	}
	return value as T;
}

// ---------------------------------------------------------------------------
// Synthetic public-publishable media fixtures
// ---------------------------------------------------------------------------

/**
 * Canonical 1×1 transparent PNG — deterministic, clearly synthetic, safe for
 * public publication (Constitution IV: public-publishable data only).
 */
const SYNTHETIC_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** The synthetic PNG fixture bytes (valid PNG header, 1×1, transparent). */
export function syntheticMediaPng(): Uint8Array<ArrayBuffer> {
	const binary = atob(SYNTHETIC_PNG_BASE64);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

export interface SyntheticMediaResult {
	result: NativeResult;
	/** Media id from the native response, registered for owned cleanup. */
	mediaId?: string;
	/**
	 * True when the native response reports the upload deduplicated onto a
	 * PRE-EXISTING asset (pinned 1.1.0 media route behavior). Such an id is
	 * never registered as owned and must never be deleted by these helpers
	 * (corrective finding 3).
	 */
	reusedExistingMedia?: boolean;
}

/**
 * Upload one synthetic public-publishable PNG through the native media API
 * (POST /_emdash/api/media, multipart field "file"). Deduplication is
 * explicitly DISABLED (`deduplicate=false`): the pinned 1.1.0 form field
 * defaults to "true", so an omitted flag resolves the deterministic fixture
 * bytes onto a pre-existing asset — and a reused asset is not an owned
 * fixture. Opting out is the documented supported control for that default
 * and keeps every upload a fresh, owned asset. If a native response
 * nevertheless reports `deduplicated: true`, the returned id is exposed
 * read-only via the result body and NEVER registered for cleanup. The id
 * used by callers is the one the native response returned — never a
 * fabricated value.
 */
export async function uploadSyntheticMedia(
	actor: CmsActor,
	options: { filename?: string } = {},
): Promise<SyntheticMediaResult> {
	const filename =
		options.filename ??
		`${SYNTHETIC_SLUG_PREFIX}media-${crypto.randomUUID().slice(0, 8)}.png`;
	const form = new FormData();
	form.append(
		"file",
		new File([syntheticMediaPng()], filename, { type: "image/png" }),
	);
	// The pinned 1.1.0 upload form parses `deduplicate` with
	// .default("true") (api/schemas/media.ts mediaUploadDeduplicateForm),
	// so silence is NOT an opt-out — the explicit "false" is required for
	// each upload to be a fresh owned fixture (T013 runtime observation).
	form.append("deduplicate", "false");
	const result = await cmsRequest(actor, "/_emdash/api/media", { method: "POST", form });
	const item = nativeItemOf(result);
	const mediaId = item?.id;
	const deduplicated = nativeDataOf(result)?.deduplicated === true;
	if (result.ok && typeof mediaId === "string") {
		if (deduplicated) {
			return { result, mediaId: undefined, reusedExistingMedia: true };
		}
		registryOf(actor).media.push(mediaId);
		return { result, mediaId };
	}
	return { result };
}

/** GET /_emdash/api/media/{id} — native media metadata read. */
export async function readMedia(actor: CmsActor, mediaId: string): Promise<NativeResult> {
	return cmsRequest(actor, `/_emdash/api/media/${encodeURIComponent(mediaId)}`);
}

/** DELETE /_emdash/api/media/{id} — native media removal (own/any boundary). */
export async function deleteMedia(actor: CmsActor, mediaId: string): Promise<NativeResult> {
	return cmsRequest(actor, `/_emdash/api/media/${encodeURIComponent(mediaId)}`, {
		method: "DELETE",
	});
}

// ---------------------------------------------------------------------------
// Synthetic content fixtures (native request shapes)
// ---------------------------------------------------------------------------

export interface SyntheticEntryInput {
	/** Native content data (e.g. { title: "..." }); supplied as-is. */
	data: Record<string, unknown>;
	/**
	 * Slug for the synthetic fixture. Defaults to a clearly synthetic
	 * prefixed unique slug so fixtures are recognizable and never collide
	 * with real editorial content.
	 */
	slug?: string;
	/** Native reference selections: { fieldSlug: [entryId, ...] }. */
	references?: Record<string, string[]>;
	/** Native taxonomy assignments: { taxonomyName: [termSlug, ...] }. */
	taxonomies?: Record<string, string[]>;
}

export interface SyntheticEntryResult {
	result: NativeResult;
	/** Entry id from the native response, registered for owned cleanup. */
	entryId?: string;
	/** `_rev` from the native response, when present. */
	rev?: string;
}

function syntheticSlug(): string {
	return `${SYNTHETIC_SLUG_PREFIX}${crypto.randomUUID().slice(0, 13)}`;
}

/**
 * Create one synthetic draft through the native content API
 * (POST /_emdash/api/content/{collection} with the native create shape;
 * authorId is set by the platform to the calling account). IDs and `_rev`
 * come from the native response; on success the entry id is registered for
 * owned-fixture cleanup. Validation refusals are returned truthfully.
 */
export async function createSyntheticEntry(
	actor: CmsActor,
	collection: string,
	input: SyntheticEntryInput,
): Promise<SyntheticEntryResult> {
	const result = await cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}`,
		{
			method: "POST",
			body: {
				data: input.data,
				slug: input.slug ?? syntheticSlug(),
				...(input.references !== undefined ? { references: input.references } : {}),
				...(input.taxonomies !== undefined ? { taxonomies: input.taxonomies } : {}),
			},
		},
	);
	const entryId = nativeItemOf(result)?.id;
	const rev = nativeRevOf(result);
	if (result.ok && typeof entryId === "string") {
		registryOf(actor).entries.push({ collection, id: entryId });
		return { result, entryId, rev };
	}
	return { result, rev };
}

// ---------------------------------------------------------------------------
// Native content reads, fresh `_rev` preconditions, lifecycle requests
// ---------------------------------------------------------------------------

/** GET /_emdash/api/content/{collection}/{id} → { item, _rev }. */
export async function readEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
	);
}

/**
 * Fresh `_rev` for optimistic-concurrency preconditions (native-editorial
 * contract: "use ... the latest returned `_rev`"). This is the mandatory
 * re-read before retrying an uncertain update/publish/schedule: it fails
 * loudly when the current entry cannot be read, rather than silently
 * reusing a stale token. Tests that want the refusal itself should use
 * readEntry and handle the result.
 */
export async function currentRev(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<string> {
	const read = await readEntry(actor, collection, id);
	const rev = nativeRevOf(read);
	if (!read.ok || rev === undefined) {
		throw new CmsHelperError(
			"REV_READ_FAILED",
			`could not obtain a current _rev for ${collection}/${id}: ${nativeRefusalOf(read)}`,
		);
	}
	return rev;
}

/** Concurrency precondition (native `_rev` and supported lock override). */
export interface RevPrecondition {
	rev?: string;
	overrideLock?: boolean;
}

function preconditionBody(pre: RevPrecondition): Record<string, unknown> {
	const body: Record<string, unknown> = {};
	if (pre.rev !== undefined) body._rev = pre.rev;
	if (pre.overrideLock !== undefined) body.overrideLock = pre.overrideLock;
	return body;
}

/**
 * PUT /_emdash/api/content/{collection}/{id} with a current `_rev`
 * precondition. When `rev` is omitted the helper performs the supported
 * fresh re-read (currentRev) first — passing a stale revision is never
 * silent. `data`/`references`/`taxonomies` are supplied in their native
 * request shapes, untouched (no reference-management abstraction).
 */
export async function updateEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	payload: {
		data?: Record<string, unknown>;
		references?: Record<string, string[]>;
		taxonomies?: Record<string, string[]>;
		slug?: string;
	} & RevPrecondition,
): Promise<NativeResult> {
	const rev = payload.rev ?? (await currentRev(actor, collection, id));
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			body: {
				_rev: rev,
				...(payload.overrideLock !== undefined
					? { overrideLock: payload.overrideLock }
					: {}),
				...(payload.data !== undefined ? { data: payload.data } : {}),
				...(payload.references !== undefined ? { references: payload.references } : {}),
				...(payload.taxonomies !== undefined ? { taxonomies: payload.taxonomies } : {}),
				...(payload.slug !== undefined ? { slug: payload.slug } : {}),
			},
		},
	);
}

/** POST …/publish — native RBAC/lifecycle checks only; refusals returned. */
export async function publishEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	pre: RevPrecondition = {},
): Promise<NativeResult> {
	const body = preconditionBody(
		pre.rev === undefined ? { ...pre, rev: await currentRev(actor, collection, id) } : pre,
	);
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/publish`,
		{ method: "POST", body },
	);
}

/**
 * POST …/schedule — one-time future publication with an explicit timezone.
 * `scheduledAt` must be ISO 8601 with "Z" or an explicit numeric offset
 * (FR-023 / native-editorial contract); anything else is refused locally as
 * a precondition error instead of relying on a native parse refusal.
 */
export async function scheduleEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	scheduledAt: string,
	pre: RevPrecondition = {},
): Promise<NativeResult> {
	if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(scheduledAt)) {
		throw new CmsHelperError(
			"PRECONDITION_INVALID",
			"scheduledAt must be an ISO 8601 datetime with Z or an explicit UTC offset (explicit timezone is required)",
		);
	}
	const body = {
		scheduledAt,
		...preconditionBody(
			pre.rev === undefined ? { ...pre, rev: await currentRev(actor, collection, id) } : pre,
		),
	};
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/schedule`,
		{ method: "POST", body },
	);
}

/** DELETE …/schedule — clear a scheduled time (native permission checks). */
export async function unscheduleEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/schedule`,
		{ method: "DELETE" },
	);
}

/** POST …/unpublish — native ownership/permission/precondition behavior. */
export async function unpublishEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	pre: RevPrecondition = {},
): Promise<NativeResult> {
	const body = preconditionBody(
		pre.rev === undefined ? { ...pre, rev: await currentRev(actor, collection, id) } : pre,
	);
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/unpublish`,
		{ method: "POST", body },
	);
}

/**
 * DELETE …/{id} — native Trash (the reversible ordinary deletion path).
 * The lock opt-out rides the query string, as the native route expects.
 */
export async function trashEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	options: { overrideLock?: boolean } = {},
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
		{
			method: "DELETE",
			...(options.overrideLock === true
				? { searchParams: { overrideLock: "true" } }
				: {}),
		},
	);
}

/** POST …/restore — restore a trashed entry (no request body). */
export async function restoreEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/restore`,
		{ method: "POST" },
	);
}

/**
 * DELETE …/permanent — native administrator-only, trash-first permanent
 * deletion. Refusals (permission, not-yet-trashed) are returned truthfully;
 * nothing here forces or bypasses the native precondition.
 */
export async function permanentlyDeleteEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<NativeResult> {
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/permanent`,
		{ method: "DELETE" },
	);
}

/**
 * Trash-aware lookup through the supported native listing
 * (GET /_emdash/api/content/{collection}/trash, permission
 * content:read_drafts, cursor-paginated). Returns:
 * - "in-trash" — the id appears in the native trash listing;
 * - "not-in-trash" — the listing was FULLY traversed (well-formed pages,
 *   terminated by a native-contract terminal cursor: the key actually
 *   absent, or an explicitly empty terminal cursor) without the id;
 * - "unknown" — traversal could not be trusted: request refusal/transport
 *   failure, a malformed success page (missing/non-array items), a
 *   nextCursor of an invalid type (number/object/boolean/array/null — the
 *   pinned native contract emits only absent-or-non-empty-string cursors),
 *   stalled or cyclic pagination (a nextCursor that repeats one already
 *   followed), or the bounded page budget ran out (corrective rounds 3–4:
 *   incomplete traversal must never be read as proven absence).
 *
 * This exists because the ORDINARY content GET hides soft-deleted entries
 * (pinned 1.1.0: findByIdOrSlug uses includeTrashed=false), so an ordinary
 * 404 alone cannot distinguish "permanently deleted" from "sitting in
 * Trash" (corrective round 2, finding 1). Never throws.
 */
export type TrashedEntryLookup = "in-trash" | "not-in-trash" | "unknown";

export async function findTrashedEntry(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<TrashedEntryLookup> {
	const MAX_PAGES = 200;
	const followedCursors = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < MAX_PAGES; page += 1) {
		let result: NativeResult;
		try {
			result = await cmsRequest(
				actor,
				`/_emdash/api/content/${encodeURIComponent(collection)}/trash`,
				{
					searchParams: {
						limit: "100",
						...(cursor !== undefined ? { cursor } : {}),
					},
				},
			);
		} catch {
			return "unknown";
		}
		if (!result.ok) {
			return "unknown";
		}
		// Validate the native success/list shape before trusting the page: a
		// malformed success (missing or non-array items) proves nothing about
		// how much of the listing was traversed — fail closed.
		const data = nativeDataOf(result);
		const items = data?.items;
		if (data === undefined || !Array.isArray(items)) {
			return "unknown";
		}
		if (items.some((item) => recordOf(item).id === id)) {
			return "in-trash";
		}
		// Terminal-cursor contract (pinned 1.1.0, ContentRepository.findTrashed
		// via handleContentListTrashed): nextCursor is assigned ONLY while more
		// pages remain — encodeCursor never yields an empty value — so the
		// native terminal page simply OMITS the key. Only an actually absent
		// cursor (or an explicitly empty terminal cursor, accepted
		// defensively) proves the listing exhausted. Any other supplied value
		// — number, object, boolean, array, null — is not a native-contract
		// cursor and proves nothing about traversal (corrective round 4:
		// malformed pagination must never become proven absence).
		const nextCursor: unknown = data.nextCursor;
		if (nextCursor === undefined || nextCursor === "") {
			// Well-formed final page — the listing is exhausted.
			return "not-in-trash";
		}
		if (typeof nextCursor !== "string") {
			return "unknown";
		}
		// A nextCursor that repeats one already followed means pagination
		// stalled or cycled; the listing was NOT proven fully traversed.
		if (nextCursor === cursor || followedCursors.has(nextCursor)) {
			return "unknown";
		}
		if (cursor !== undefined) {
			followedCursors.add(cursor);
		}
		cursor = nextCursor;
	}
	return "unknown";
}

/**
 * Where an entry actually is, reconciled through native state rather than
 * the ordinary GET alone: "live" (ordinary read succeeds), "trashed" (shown
 * by the native trash listing), "absent" (neither the trash listing nor the
 * ordinary read can find it — genuinely deleted), or "unknown". Never
 * throws.
 */
type EntryPresence = "live" | "trashed" | "absent" | "unknown";

async function probeEntryPresence(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<EntryPresence> {
	const trashLookup = await findTrashedEntry(actor, collection, id);
	if (trashLookup === "in-trash") {
		return "trashed";
	}
	if (trashLookup === "unknown") {
		return "unknown";
	}
	try {
		const read = await readEntry(actor, collection, id);
		if (read.ok) {
			return "live";
		}
		if (read.status === 404) {
			return "absent";
		}
	} catch {
		// fall through to unknown
	}
	return "unknown";
}

// ---------------------------------------------------------------------------
// Cleanup — restricted to fixtures these helpers registered as owned
// ---------------------------------------------------------------------------

export interface CleanupEntryReport {
	collection: string;
	id: string;
	/** Proven moved to trash (directly or via the native trash listing). */
	trashed: boolean;
	/** Proven permanently deleted — never inferred from an ordinary 404. */
	permanentlyDeleted: boolean;
	/**
	 * True when the fixture is proven resolved and was removed from the
	 * ownership registry; unresolved fixtures REMAIN registered so a later
	 * cleanup can retry them (corrective finding 4).
	 */
	resolved: boolean;
	/** Non-secret summary of the last observed refusal, when any. */
	refusal?: string;
	/** How the outcome was proven, when it was not the direct response. */
	note?: string;
}

export interface CleanupMediaReport {
	id: string;
	/** Proven deleted, or proven already absent. */
	deleted: boolean;
	/** True when removed from the ownership registry (see above). */
	resolved: boolean;
	refusal?: string;
	note?: string;
}

export interface CleanupReport {
	entries: CleanupEntryReport[];
	media: CleanupMediaReport[];
	/** False when any owned fixture remains unresolved — never hidden. */
	complete: boolean;
}

/**
 * Clean up the synthetic fixtures registered as owned by `owner` — and only
 * those (the WeakMap registry is the creation-ownership boundary; a
 * deduplicated/reused native asset is never in it).
 *
 * Resilience contract (corrective findings 4 and round-2 findings 1/3):
 * - cleanup never throws past a failed step; every fixture is attempted
 *   independently and reported, with the acting credentials' own secret
 *   material scrubbed from every recorded failure text;
 * - uncertain outcomes are reconciled through NATIVE trash-aware state, not
 *   the ordinary GET alone: an ordinary 404 can simply mean the entry sits
 *   in Trash (native soft delete hides it from ordinary reads), so
 *   reconciliation uses the native trash listing (paginated) plus the
 *   ordinary read. An entry is only ever reported permanently deleted when
 *   the purge succeeded directly or a post-purge state probe proves it
 *   absent from BOTH the trash listing and the ordinary read. Trash-first
 *   and administrator-only native deletion are respected (a live entry is
 *   never purged directly; a refused purge leaves the fixture registered);
 * - only proven-resolved fixtures are removed from the registry —
 *   unresolved ones stay registered so a repeated cleanup safely retries
 *   them;
 * - `adminActor` may supply native administrative authority for the
 *   deletion calls (e.g. fixtures created under a lesser-role actor), but
 *   it must identify the SAME configured native application as `owner`
 *   (assertSameNativeApp is enforced before any request), while `owner`'s
 *   registry still exclusively defines what may be touched.
 *
 * Run it with an administrator-capable authority when permanent deletion is
 * expected; lesser authorities produce truthful refusals in the report
 * instead of false success. Volumes, real media, pre-existing data, and
 * anything unregistered are never touched.
 */
export async function cleanupOwnedFixtures(
	owner: CmsActor,
	options: { adminActor?: CmsActor; permanent?: boolean } = {},
): Promise<CleanupReport> {
	const registry = registryOf(owner);
	const executor = options.adminActor ?? owner;
	if (options.adminActor !== undefined) {
		// An administrative executor operates on the owner's registered IDs;
		// both must identify the same configured native application, checked
		// before ANY cleanup request is made (round-2 finding 3).
		assertSameNativeApp(owner, options.adminActor);
	}
	const permanent = options.permanent !== false;
	const scrubSecrets = [owner.knownSecret(), executor.knownSecret()];
	const report: CleanupReport = { entries: [], media: [], complete: true };
	const resolvedEntryIds = new Set<string>();
	const resolvedMediaIds = new Set<string>();

	for (const entry of registry.entries.slice().reverse()) {
		const entryReport: CleanupEntryReport = {
			collection: entry.collection,
			id: entry.id,
			trashed: false,
			permanentlyDeleted: false,
			resolved: false,
		};
		let absent = false;
		try {
			const trash = await trashEntry(executor, entry.collection, entry.id);
			entryReport.trashed = trash.ok;
			if (!trash.ok) {
				entryReport.refusal = nativeRefusalOf(trash);
			}
		} catch (cause) {
			entryReport.refusal = failureText(cause, scrubSecrets);
		}
		if (!entryReport.trashed) {
			// Uncertain trash outcome. The ordinary GET alone cannot decide:
			// native soft delete hides trashed entries from it. Reconcile
			// through the native trash listing plus the ordinary read.
			const presence = await probeEntryPresence(executor, entry.collection, entry.id);
			if (presence === "trashed") {
				entryReport.trashed = true;
				entryReport.note = "proven in the native trash listing after an uncertain trash outcome";
			} else if (presence === "absent") {
				absent = true;
				entryReport.trashed = true;
				entryReport.permanentlyDeleted = true;
				entryReport.note = "already absent (not in the native trash listing; ordinary read 404)";
			} else if (presence === "live") {
				entryReport.note = "still a live entry; the native trash-first path must succeed before purge";
			}
			// "unknown" keeps the observed refusal and stays unresolved.
		}
		if (permanent && entryReport.trashed && !absent && !entryReport.permanentlyDeleted) {
			try {
				const purge = await permanentlyDeleteEntry(executor, entry.collection, entry.id);
				entryReport.permanentlyDeleted = purge.ok;
				if (!purge.ok) {
					entryReport.refusal = entryReport.refusal ?? nativeRefusalOf(purge);
				}
			} catch (cause) {
				entryReport.refusal = entryReport.refusal ?? failureText(cause, scrubSecrets);
			}
			if (!entryReport.permanentlyDeleted) {
				// Uncertain purge outcome — prove the actual native state
				// before claiming (or denying) permanent deletion.
				const presence = await probeEntryPresence(executor, entry.collection, entry.id);
				if (presence === "absent") {
					entryReport.permanentlyDeleted = true;
					entryReport.note = "purge verified by native state re-read after an uncertain response";
				}
			}
		}
		entryReport.resolved = absent || (permanent ? entryReport.permanentlyDeleted : entryReport.trashed);
		if (entryReport.resolved) {
			resolvedEntryIds.add(entry.id);
		} else {
			report.complete = false;
		}
		report.entries.push(entryReport);
	}

	for (const mediaId of registry.media.slice().reverse()) {
		const mediaReport: CleanupMediaReport = { id: mediaId, deleted: false, resolved: false };
		try {
			const removal = await deleteMedia(executor, mediaId);
			mediaReport.deleted = removal.ok;
			if (!removal.ok) {
				mediaReport.refusal = nativeRefusalOf(removal);
			}
		} catch (cause) {
			mediaReport.refusal = failureText(cause, scrubSecrets);
		}
		if (!mediaReport.deleted) {
			try {
				const state = await readMedia(executor, mediaId);
				if (state.status === 404) {
					mediaReport.deleted = true;
					mediaReport.note = "already absent before cleanup";
				} else if (!state.ok) {
					mediaReport.refusal = mediaReport.refusal ?? nativeRefusalOf(state);
				}
			} catch (cause) {
				mediaReport.refusal = mediaReport.refusal ?? failureText(cause, scrubSecrets);
			}
		}
		mediaReport.resolved = mediaReport.deleted;
		if (mediaReport.resolved) {
			resolvedMediaIds.add(mediaId);
		} else {
			report.complete = false;
		}
		report.media.push(mediaReport);
	}

	// Retain unresolved owned fixtures for a later retry; drop only the
	// proven-resolved ones.
	registry.entries = registry.entries.filter((entry) => !resolvedEntryIds.has(entry.id));
	registry.media = registry.media.filter((mediaId) => !resolvedMediaIds.has(mediaId));
	return redactSecrets(report, scrubSecrets) as CleanupReport;
}

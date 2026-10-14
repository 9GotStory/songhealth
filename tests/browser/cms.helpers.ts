// T002 — bounded native request/fixture helpers for the Feature 002 focused
// CMS checks. Test support in tests/browser/ only: no application, schema,
// seed, dependency, infrastructure, or production change is made here.
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
// - POST /_emdash/api/media — multipart form field "file" (+ optional
//   deduplicate/ensureUniqueFilename/folderId/fieldId/width/height/thumbnail),
//   media:upload permission, response data { item: { id, ... } }
// - GET/PUT/DELETE /_emdash/api/media/{id} — media:read;
//   media:edit_own + ownership (editors+ any); media:delete_own + ownership
//   (editors+ any)
//
// Boundaries (tasks.md shared constraints; Constitution v3.0.0 II–V):
// - development-only access: dev-bypass is used exactly as README §7
//   documents it; no production Passkey automation, no custom authentication
// - no RBAC/impersonation abstraction: role fixtures use only the supported
//   native account/role operations above. An Administrator token is never
//   presented as coverage of another role — assertDistinctActors refuses the
//   shortcut and every role phase is verified live through /auth/me. Where
//   the environment lacks a second PAT-owning account (T001 §6 records that
//   standing truthfully), the calling tests must report the gap; these
//   helpers do not manufacture identities
// - no reference-management abstraction: `references`/`taxonomies` maps are
//   passed through in EmDash's native request shapes untouched
// - no schema operations and no synthetic official inventories: these
//   helpers only create/read/lifecycle content and clearly-marked synthetic
//   public-publishable media; Feature 002 schema/taxonomy work belongs to
//   its owning tasks
// - secrets: bearer credentials live only in memory inside CmsActor (or in
//   caller-held ignored mode-0600 scratch loaded through readSecretScratch,
//   which refuses any looser file mode). They are never logged or embedded
//   in errors; CmsActor serializes to a redacted view; every native result
//   returned by these helpers is passed through redactSecrets
// - cleanup is restricted to fixture IDs these helpers themselves registered
//   as owned (WeakMap registry); it never touches volumes, real media,
//   pre-existing data, or records it did not create
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
 * missing identity fields, failed precondition reads, unsafe secret scratch).
 * Native API refusals are NEVER thrown — they are returned as results so
 * tests report them truthfully. Messages are secret-free by construction.
 */
export class CmsHelperError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`[${code}] ${message}`);
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

/** Anything that looks like a native credential string is redacted. */
export function isSecretLike(value: string): boolean {
	return SECRET_VALUE_PATTERN.test(value) || /^Bearer\s+\S/i.test(value);
}

/**
 * Deep, cycle-safe copy of `value` in which secret-looking values and
 * well-known secret-bearing keys are replaced. Every native result returned
 * by these helpers passes through this once, so evidence built from results
 * cannot carry credentials by accident.
 */
export function redactSecrets<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
	if (typeof value === "string") {
		return (isSecretLike(value) ? REDACTED : value) as unknown as T;
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
		return source.map((entry) => redactSecrets(entry, seen)) as unknown as T;
	}
	const copy: Record<string, unknown> = {};
	for (const key of Object.keys(source)) {
		const entry = (source as Record<string, unknown>)[key];
		copy[key] =
			typeof entry === "string" && SECRET_KEY_PATTERN.test(key)
				? REDACTED
				: redactSecrets(entry, seen);
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
// Request core
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
 * Perform one native API request. `authorization` is null only for the
 * unauthenticated development bootstrap path. Native refusals (4xx/5xx) are
 * returned as results; only transport failures throw, with secret-free
 * messages (a credential travels solely in the Authorization header).
 */
async function rawRequest(
	baseUrl: string,
	path: string,
	authorization: string | null,
	options: CmsRequestOptions,
): Promise<NativeResult> {
	const url = new URL(path, `${baseUrl.replace(/\/+$/, "")}/`);
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
		});
	} catch (cause) {
		const reason = cause instanceof Error ? cause.message : String(cause);
		throw new CmsHelperError(
			"REQUEST_TRANSPORT",
			`${options.method ?? "GET"} ${path} failed to reach the configured development app: ${reason}`,
		);
	}
	const text = await response.text();
	let parsed: unknown;
	try {
		parsed = text.length > 0 ? JSON.parse(text) : undefined;
	} catch {
		parsed = { nonJsonBody: text };
	}
	return { ok: response.ok, status: response.status, body: redactSecrets(parsed) };
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
	return rawRequest(actor.baseUrl, path, actor.bearerValue(), options);
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
 * The minted PAT exists only in memory afterwards.
 */
export async function createDevBypassActor(options: DevBypassOptions = {}): Promise<CmsActor> {
	// Unauthenticated by design: this IS the development bootstrap.
	const result = await rawRequest(
		baseUrlOrDefault(options.baseUrl),
		"/_emdash/api/setup/dev-bypass",
		null,
		{ method: "POST", searchParams: { token: "1" } },
	);
	if (result.status === 403) {
		throw new CmsHelperError(
			"DEV_BYPASS_FORBIDDEN",
			"the configured app refused dev-bypass (403): the native bootstrap is available in development builds only (README §7); no production authentication is attempted",
		);
	}
	if (!result.ok) {
		throw new CmsHelperError(
			"DEV_BYPASS_FAILED",
			`dev-bypass bootstrap failed: ${nativeRefusalOf(result)}`,
		);
	}
	const data = nativeDataOf(result);
	const token = requireString(data?.token, "the minted PAT (only present with ?token=1)");
	const user = recordOf(data?.user);
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

/**
 * Run `fn` while the fixture actor's native account holds `role`.
 *
 * Supported-operation shape, pinned by the 1.1.0 guards: the orchestrator
 * (an Administrator on a DIFFERENT account — assertDistinctActors enforces
 * it, and the platform's SELF_ROLE_CHANGE guard would refuse otherwise)
 * sets the fixture account's role via the users API; the fixture actor's
 * credential acts at that role because the auth middleware re-reads its
 * user record on every request. The role change is verified live through
 * /auth/me before `fn` runs, and the original role is restored and
 * re-verified afterwards — including when `fn` throws. A failed restore is
 * reported loudly (ROLE_RESTORE_FAILED) rather than left silent.
 *
 * This is not an impersonation layer: nothing forges identity, mints roles,
 * or bypasses a permission check; each phase exercises the real native
 * permission decisions for that role level.
 */
export async function withNativeRole<T>(
	admin: CmsActor,
	actor: CmsActor,
	role: NativeRoleLevel,
	fn: (actor: CmsActor) => Promise<T>,
): Promise<T> {
	assertDistinctActors(admin, actor);
	const before = await getUser(admin, actor.userId);
	const originalRole = userRoleOf(before);
	if (!before.ok || originalRole === undefined) {
		throw new CmsHelperError(
			"ROLE_PRECONDITION_FAILED",
			`could not read the current role of fixture account ${actor.userId}: ${nativeRefusalOf(before)}`,
		);
	}
	const switchResult = await setUserRole(admin, actor.userId, role);
	if (!switchResult.ok || userRoleOf(switchResult) !== role) {
		throw new CmsHelperError(
			"ROLE_SWITCH_REFUSED",
			`native role operation refused to set ${nativeRoleName(role)} for account ${actor.userId}: ${nativeRefusalOf(switchResult)}`,
		);
	}
	const liveMe = await getMe(actor);
	const liveRole = nativeDataOf(liveMe)?.role;
	if (!liveMe.ok || liveRole !== role) {
		await setUserRole(admin, actor.userId, originalRole as NativeRoleLevel);
		throw new CmsHelperError(
			"ROLE_SWITCH_UNVERIFIED",
			`fixture credential did not verify at role ${nativeRoleName(role)} via /_emdash/api/auth/me (observed ${String(liveRole)}); the original role was restored`,
		);
	}
	let failure: unknown;
	let failureIsError = false;
	let value: T | undefined;
	try {
		value = await fn(actor);
	} catch (cause) {
		failure = cause;
		failureIsError = true;
	}
	const restore = await setUserRole(admin, actor.userId, originalRole as NativeRoleLevel);
	const restoreVerified = restore.ok
		? nativeDataOf(await getMe(actor))?.role === originalRole
		: false;
	if (!restore.ok || !restoreVerified) {
		throw new CmsHelperError(
			"ROLE_RESTORE_FAILED",
			`fixture account ${actor.userId} may still hold role ${nativeRoleName(role)}; restoring ${nativeRoleName(originalRole)} failed or did not verify (${nativeRefusalOf(restore)})`,
		);
	}
	if (failureIsError) {
		throw failure;
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
}

/**
 * Upload one synthetic public-publishable PNG through the native media API
 * (POST /_emdash/api/media, multipart field "file"). The id used by callers
 * is the one the native response returned — never a fabricated value. On
 * success the id is registered for owned-fixture cleanup.
 */
export async function uploadSyntheticMedia(
	actor: CmsActor,
	options: { filename?: string; deduplicate?: boolean } = {},
): Promise<SyntheticMediaResult> {
	const filename = options.filename ?? `${SYNTHETIC_SLUG_PREFIX}media.png`;
	const form = new FormData();
	form.append(
		"file",
		new File([syntheticMediaPng()], filename, { type: "image/png" }),
	);
	if (options.deduplicate === true) {
		form.append("deduplicate", "true");
	}
	const result = await cmsRequest(actor, "/_emdash/api/media", { method: "POST", form });
	const mediaId = nativeItemOf(result)?.id;
	if (result.ok && typeof mediaId === "string") {
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

// ---------------------------------------------------------------------------
// Cleanup — restricted to fixtures these helpers registered as owned
// ---------------------------------------------------------------------------

export interface CleanupEntryReport {
	collection: string;
	id: string;
	trashed: boolean;
	permanentlyDeleted: boolean;
	refusal?: string;
}

export interface CleanupMediaReport {
	id: string;
	deleted: boolean;
	refusal?: string;
}

export interface CleanupReport {
	entries: CleanupEntryReport[];
	media: CleanupMediaReport[];
	/** False when any step was refused or failed — reported, never hidden. */
	complete: boolean;
}

/**
 * Clean up the synthetic fixtures THIS helper set registered for the actor —
 * and only those: entries move through the native reversible path (trash)
 * and, by default, the administrator-owned permanent delete; owned media is
 * removed through the native media API. Every refusal is recorded in the
 * secret-free report; cleanup never throws, never retries blindly, and never
 * touches anything it did not register (no volumes, real media, or
 * pre-existing data). Run it with an administrator-capable actor when
 * permanent deletion is expected; lesser authorities produce truthful
 * refusals in the report instead of false success.
 */
export async function cleanupOwnedFixtures(
	actor: CmsActor,
	options: { permanent?: boolean } = {},
): Promise<CleanupReport> {
	const registry = registryOf(actor);
	const permanent = options.permanent !== false;
	const report: CleanupReport = { entries: [], media: [], complete: true };
	for (const entry of registry.entries.slice().reverse()) {
		const entryReport: CleanupEntryReport = {
			collection: entry.collection,
			id: entry.id,
			trashed: false,
			permanentlyDeleted: false,
		};
		const trash = await trashEntry(actor, entry.collection, entry.id);
		entryReport.trashed = trash.ok;
		if (!trash.ok) {
			entryReport.refusal = nativeRefusalOf(trash);
		}
		if (permanent) {
			const purge = await permanentlyDeleteEntry(actor, entry.collection, entry.id);
			entryReport.permanentlyDeleted = purge.ok;
			if (!purge.ok) {
				entryReport.refusal = entryReport.refusal ?? nativeRefusalOf(purge);
			}
		}
		if (!entryReport.trashed || (permanent && !entryReport.permanentlyDeleted)) {
			report.complete = false;
		}
		report.entries.push(entryReport);
	}
	for (const mediaId of registry.media.slice().reverse()) {
		const mediaReport: CleanupMediaReport = { id: mediaId, deleted: false };
		const removal = await deleteMedia(actor, mediaId);
		mediaReport.deleted = removal.ok;
		if (!removal.ok) {
			mediaReport.refusal = nativeRefusalOf(removal);
		}
		if (!mediaReport.deleted) {
			report.complete = false;
		}
		report.media.push(mediaReport);
	}
	registry.entries = [];
	registry.media = [];
	return redactSecrets(report) as CleanupReport;
}

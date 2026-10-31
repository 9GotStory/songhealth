// Native request and fixture helpers for the browser suites (Feature 002 T002; every Feature 002
// and 003 suite builds on them).
//
// What they provide:
// - actors: the development Administrator from its 0600 PAT file (loadDevAccessToken and
//   createPatActor) and distinct role accounts (withNativeRole), each verified through
//   /_emdash/api/auth/me. An Administrator token never stands in for another role
//   (assertDistinctActors).
// - cmsRequest, the one request core. It reaches only the configured origin's /_emdash/ API,
//   refuses redirects, and returns native refusals as results instead of throwing them.
// - synthetic entries and media marked with SYNTHETIC_FIXTURE_MARK, lifecycle calls with a fresh
//   `_rev`, and cleanupOwnedFixtures, which removes only what these helpers registered as owned.
// - secret handling: every reported result and message is scrubbed of credentials, and
//   credential files load only at mode 0600.
// - refusal checks the CMS suites share (a validation refusal, an unresolvable reference target,
//   an authorization refusal) and anonymousRequest, a request without a credential. They assert
//   with Playwright's expect, which also runs outside the test runner (@playwright/test 1.63.0,
//   playwright/lib/matchers/expect.js), so FixtureKit's plain Node scripts load this module too.
//
// Platform behaviour relied on (emdash 1.1.0):
// - Responses are `{ success: true, data }` or `{ success: false, error: { code, message } }`
//   (src/api/error.ts).
// - A Bearer PAT resolves its user on every request, so a role change applies at once
//   (src/astro/middleware/auth.ts handleBearerAuth). Role levels: Subscriber 10, Contributor 20,
//   Author 30, Editor 40, Administrator 50.
// - Users change only through GET and PUT /_emdash/api/admin/users/{id}, which refuses a change
//   of the caller's own role and the demotion of the last administrator. Role phases therefore
//   need a second account; REST cannot create users.
// - Content (src/api/schemas/content.ts): POST /_emdash/api/content/{collection} creates a draft
//   owned by the caller. PUT, …/publish, …/schedule (ISO 8601 with Z or an offset), …/unpublish,
//   DELETE (to trash), …/restore and …/permanent (Administrator, trash first) take `_rev` and
//   `overrideLock`.
// - The ordinary content read hides trashed entries, so its 404 does not prove deletion. Cleanup
//   reads the trash listing (…/{collection}/trash, cursor pagination) before it reports an
//   outcome (src/database/repositories/content.ts findByIdOrSlug).
// - A media upload returns an existing asset with the same content unless `deduplicate=false` is
//   sent (src/api/schemas/media.ts). These helpers always send it, so cleanup never deletes an
//   asset it did not create.
// - setup/dev-bypass applies the seed and, with ?token=1, rotates the development PAT
//   (src/astro/routes/api/setup/dev-bypass.ts). createDevBypassActor wraps it for a fresh
//   install only; no suite calls it.
// - A content API request with no token and no session is refused before its route runs: a
//   state-changing one without `X-EmDash-Request: 1` with 403 CSRF_REJECTED, any other with 401
//   NOT_AUTHENTICATED (src/astro/middleware/auth.ts). Public API routes check CSRF by Origin
//   instead (src/api/csrf.ts checkPublicCsrf).
//
// Cleanup never throws past a failed step. Each owned fixture is attempted on its own, an
// uncertain outcome is read again, and an unresolved fixture stays registered for a later retry.

import { appendFile, lstat, readFile, stat } from "node:fs/promises";
import { env } from "node:process";
import { crc32, deflateSync } from "node:zlib";

import { expect } from "@playwright/test";

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
 */
export async function readSecretScratch(path: string): Promise<string> {
	const stats = await stat(path);
	if (!stats.isFile()) {
		throw new CmsHelperError("SECRET_SCRATCH_INVALID", `${path} is not a regular file`);
	}
	if ((stats.mode & 0o777) !== 0o600) {
		throw new CmsHelperError(
			"SECRET_SCRATCH_INVALID",
			`refusing to read ${path}: credential scratch must be mode 0600 (git-ignored), never group/world readable`,
		);
	}
	const raw = await readFile(path, "utf8");
	const credential = raw.trim();
	if (credential.length === 0 || credential.includes("\n")) {
		throw new CmsHelperError("SECRET_SCRATCH_INVALID", `${path} must hold exactly one credential`);
	}
	return credential;
}

/**
 * Environment variable naming the existing Songhealth development credential
 * for the PAT-based suites: the single runtime's bare-token `dev-pat` (T037)
 * or a JSON `{ token }` file. The path is configuration, never a source
 * constant (Constitution III).
 */
export const DEV_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_DEV_ACCESS";

/** One bare EmDash personal access token, as the single runtime stores it. */
const BARE_PAT_PATTERN = /^ec_pat_[A-Za-z0-9_-]+$/;

/**
 * Load the existing Songhealth development credential's PAT into memory only
 * (T013 test-authentication adaptation: the suites consume the pre-existing
 * development credential instead of re-running the seed-applying dev-bypass
 * bootstrap, which would replace same-named tokens and reapply seed intent on
 * every run). Two formats are accepted: the single development runtime's
 * `dev-pat`, one bare `ec_pat_` token (T037), and a JSON `{ token }` file
 * (such as the T021 route-access client copy). The file must be a regular,
 * non-symlink, mode-0600 file — the same fail-closed discipline as
 * readSecretScratch. It is parsed in memory; the token is returned to the
 * caller and never logged, hashed, or rewritten.
 *
 * Path resolution: the explicit argument, else DEV_ACCESS_CREDENTIAL_ENV.
 */
export async function loadDevAccessToken(path?: string): Promise<string> {
	const resolved = path ?? env[DEV_ACCESS_CREDENTIAL_ENV];
	if (resolved === undefined || resolved.trim().length === 0) {
		throw new CmsHelperError(
			"DEV_ACCESS_PATH_MISSING",
			`no development credential path: pass one or set ${DEV_ACCESS_CREDENTIAL_ENV}`,
		);
	}
	const stats = await lstat(resolved);
	if (!stats.isFile() || stats.isSymbolicLink()) {
		throw new CmsHelperError("DEV_ACCESS_INVALID", `${resolved} is not a regular non-symlink file`);
	}
	if ((stats.mode & 0o777) !== 0o600) {
		throw new CmsHelperError(
			"DEV_ACCESS_INVALID",
			`refusing to read ${resolved}: the development credential must be mode 0600, never group/world readable`,
		);
	}
	const text = (await readFile(resolved, "utf8")).trim();
	if (BARE_PAT_PATTERN.test(text)) {
		return text;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new CmsHelperError(
			"DEV_ACCESS_INVALID",
			`${resolved} is neither one bare ec_pat_ token nor valid JSON`,
		);
	}
	const token =
		parsed !== null && typeof parsed === "object"
			? (parsed as Record<string, unknown>).token
			: undefined;
	if (typeof token !== "string" || token.trim().length === 0) {
		throw new CmsHelperError(
			"DEV_ACCESS_INVALID",
			`${resolved} carries no non-empty string token field`,
		);
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

/** A content item's lifecycle `status`, when the read carries one. */
export function statusOfItem(item: Record<string, unknown> | undefined): string | undefined {
	return typeof item?.status === "string" ? item.status : undefined;
}

/** A content item's field `data`; a drafts read answers a pending draft's values here. */
export function dataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return recordOf(item?.data);
}

/**
 * The published values a drafts read gives as `liveData` while an entry has a pending draft
 * (emdash 1.1.0 src/emdash-runtime.ts hydrateDraftData).
 */
export function liveDataOfItem(item: Record<string, unknown> | undefined): Record<string, unknown> {
	return recordOf(item?.liveData);
}

function requireString(value: unknown, what: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new CmsHelperError("NATIVE_SHAPE_UNEXPECTED", `native response lacked ${what}`);
	}
	return value;
}

/** Narrow an unknown native value to a plain record (empty when not one). */
function recordOf(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

/**
 * One native API request without a credential, through the same core as cmsRequest: on `origin`'s
 * /_emdash/ API only, following no redirect, and answering a refusal as a result. It sends no
 * `X-EmDash-Request` header, so a state-changing request meets EmDash's CSRF check first.
 */
export async function anonymousRequest(
	origin: string,
	path: string,
	options: CmsRequestOptions = {},
): Promise<NativeResult> {
	const raw = await rawRequest(origin, path, null, options);
	return { ok: raw.ok, status: raw.status, body: raw.body };
}

function baseUrlOrDefault(baseUrl?: string): string {
	if (baseUrl !== undefined) {
		return baseUrl;
	}
	// The documented development origin for a caller that names none; the suites pass
	// configuredDevelopmentOrigin's.
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
			? (((raw.rawBody as Record<string, unknown>).data ?? {}) as Record<string, unknown>)
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
	if (options.expected?.userId !== undefined && options.expected.userId !== verified.userId) {
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

/**
 * The origin the suites run against, as playwright.config.ts resolves it: PLAYWRIGHT_BASE_URL, else
 * the documented development origin.
 */
export function configuredDevelopmentOrigin(): string {
	return new URL(env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN).origin;
}

/** The development Administrator's account, which the development PAT belongs to. */
const DEV_ADMIN_EMAIL = "dev@emdash.local";

/**
 * The development Administrator on `origin`, else the configured origin: the development PAT's
 * actor (DEV_ACCESS_CREDENTIAL_ENV), verified as the dev@emdash.local account at the
 * Administrator role. The suites' admin setup.
 */
export async function devAdminActor(origin?: string): Promise<CmsActor> {
	const admin = await createPatActor({
		baseUrl: origin ?? configuredDevelopmentOrigin(),
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	if (admin.email !== DEV_ADMIN_EMAIL) {
		throw new CmsHelperError(
			"IDENTITY_MISMATCH",
			`the development credential belongs to ${admin.email}, not ${DEV_ADMIN_EMAIL}`,
		);
	}
	return admin;
}

/** Environment variable naming the role fixture's 0600 PAT file (scripts/dev-runtime-env.sh). */
export const ROLE_FIXTURE_CREDENTIAL_ENV = "SONGHEALTH_ROLE_FIXTURE_ACCESS";

/**
 * The role fixture account's actor, for role phases beside `admin` (withNativeRole), or undefined
 * when ROLE_FIXTURE_CREDENTIAL_ENV is unset. It must be another account of the same application.
 */
export async function roleFixtureActor(admin: CmsActor): Promise<CmsActor | undefined> {
	const path = env[ROLE_FIXTURE_CREDENTIAL_ENV]?.trim();
	if (!path) return undefined;
	const fixture = await createPatActor({
		baseUrl: admin.baseUrl,
		token: await loadDevAccessToken(path),
	});
	assertDistinctActors(admin, fixture);
	assertSameNativeApp(admin, fixture);
	return fixture;
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
export async function listUsers(
	admin: CmsActor,
	options: ListUsersOptions = {},
): Promise<NativeResult> {
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
			if (
				!afterAdmin.ok ||
				adminRole !== originalRole ||
				!afterLive.ok ||
				liveRole !== originalRole
			) {
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

/** The exact size in bytes of every synthetic PDF. */
export const SYNTHETIC_PDF_BYTES = 2048;

/**
 * A valid one-page, blank PDF of exactly SYNTHETIC_PDF_BYTES bytes: public-publishable, clearly
 * synthetic, and unique per call through a padding comment, so no upload deduplicates onto another.
 */
export function syntheticMediaPdf(): Uint8Array<ArrayBuffer> {
	const body = [
		"%PDF-1.4",
		"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
		"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
		"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj",
		"trailer << /Root 1 0 R >>",
		`% ${SYNTHETIC_FIXTURE_MARK} ${crypto.randomUUID()}`,
	].join("\n");
	const end = "\n%%EOF\n";
	const padding = " ".repeat(SYNTHETIC_PDF_BYTES - body.length - end.length - 2);
	const bytes = new TextEncoder().encode(`${body}\n%${padding}${end}`);
	if (bytes.length !== SYNTHETIC_PDF_BYTES)
		throw new CmsHelperError("synthetic-pdf", "synthetic PDF size drifted");
	return new Uint8Array(bytes);
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
	options: {
		filename?: string;
		/** Other bytes than the synthetic PNG, with their MIME type, such as a synthetic PDF. */
		file?: { bytes: Uint8Array<ArrayBuffer>; type: string };
	} = {},
): Promise<SyntheticMediaResult> {
	const filename =
		options.filename ?? `${SYNTHETIC_SLUG_PREFIX}media-${crypto.randomUUID().slice(0, 8)}.png`;
	const { bytes, type } = options.file ?? { bytes: syntheticMediaPng(), type: "image/png" };
	const form = new FormData();
	form.append("file", new File([bytes], filename, { type }));
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

/** A synthetic PDF in the media library, and the file field value that points at it. */
export interface SyntheticPdf {
	mediaId: string;
	filename: string;
	storageKey: string;
	/** The file field value the Admin's file picker saves for it. */
	value: Record<string, unknown>;
}

/**
 * Upload a synthetic PDF named `filename` (a unique one by default) as an owned fixture, with the
 * file field value the Admin's picker sends (@emdash-cms/admin 1.1.0 FileFieldRenderer). A Document
 * needs one, since its file is required. A refusal throws.
 */
export async function uploadSyntheticPdf(
	actor: CmsActor,
	filename = `${SYNTHETIC_FIXTURE_MARK}-${crypto.randomUUID().slice(0, 8)}.pdf`,
): Promise<SyntheticPdf> {
	const uploaded = await uploadSyntheticMedia(actor, {
		filename,
		file: { bytes: syntheticMediaPdf(), type: "application/pdf" },
	});
	if (uploaded.mediaId === undefined) {
		throw new CmsHelperError(
			"synthetic-pdf",
			`the synthetic PDF: ${nativeRefusalOf(uploaded.result)}`,
		);
	}
	const item = nativeItemOf(uploaded.result) as {
		id: string;
		filename: string;
		mimeType: string;
		size: number;
		storageKey: string;
	};
	return {
		mediaId: item.id,
		filename: item.filename,
		storageKey: item.storageKey,
		value: {
			id: item.id,
			provider: "local",
			filename: item.filename,
			mimeType: item.mimeType,
			size: item.size,
			meta: { storageKey: item.storageKey },
		},
	};
}

/** PUT /_emdash/api/media/{id} — set a media item's alt text, as Admin's media library does. */
export async function setMediaAlt(
	actor: CmsActor,
	mediaId: string,
	alt: string,
): Promise<NativeResult> {
	return cmsRequest(actor, `/_emdash/api/media/${encodeURIComponent(mediaId)}`, {
		method: "PUT",
		body: { alt },
	});
}

/**
 * Upload a synthetic picture as an owned fixture, give it `alt` as its alt text in the media
 * library, and return its media id. A refusal throws.
 */
export async function uploadSyntheticPicture(actor: CmsActor, alt: string): Promise<string> {
	const media = await uploadSyntheticMedia(actor);
	if (media.mediaId === undefined) {
		throw new CmsHelperError("synthetic-picture", `the picture: ${nativeRefusalOf(media.result)}`);
	}
	const described = await setMediaAlt(actor, media.mediaId, alt);
	if (!described.ok) {
		throw new CmsHelperError("synthetic-picture", `its alt text: ${nativeRefusalOf(described)}`);
	}
	return media.mediaId;
}

/** A 1200×750 PNG, a diagonal blend from the hex colour `from` to `to`: a stand-in photo. */
export function gradientPng(from: string, to: string): Uint8Array<ArrayBuffer> {
	const [width, height] = [1200, 750];
	const [a, b] = [from, to].map((hex) =>
		[1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)),
	);
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
		const framed = Buffer.alloc(body.length + 8);
		framed.writeUInt32BE(data.length, 0);
		body.copy(framed, 4);
		framed.writeUInt32BE(crc32(body), body.length + 4);
		return framed;
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
	const rows = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y += 1) {
		const row = y * (width * 3 + 1); // each row starts with filter type 0
		for (let x = 0; x < width; x += 1) {
			const t = (x / width + y / height) / 2;
			rows.set(
				a!.map((channel, index) => Math.round(channel + (b![index]! - channel) * t)),
				row + 1 + x * 3,
			);
		}
	}
	return new Uint8Array(
		Buffer.concat([
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			chunk("IHDR", header),
			chunk("IDAT", deflateSync(rows)),
			chunk("IEND", Buffer.alloc(0)),
		]),
	);
}

/**
 * Upload `file` as a new media item named `filename`, give it `alt` as its alt text when given, and
 * return the item as the native API answers it. Deduplication is off, so the item is always new. A
 * refusal throws, after deleting the item when only its alt text was refused. Unlike
 * uploadSyntheticMedia, nothing registers the item for owned cleanup: the caller removes it.
 */
export async function uploadMediaItem(
	actor: CmsActor,
	filename: string,
	file: { bytes: Uint8Array<ArrayBuffer>; type: string },
	alt?: string,
): Promise<Record<string, unknown> & { id: string }> {
	const form = new FormData();
	form.append("file", new File([file.bytes], filename, { type: file.type }));
	form.append("deduplicate", "false");
	const uploaded = await cmsRequest(actor, "/_emdash/api/media", { method: "POST", form });
	const item = nativeItemOf(uploaded);
	if (!uploaded.ok || typeof item?.id !== "string") {
		throw new CmsHelperError("MEDIA_UPLOAD", `${filename}: ${nativeRefusalOf(uploaded)}`);
	}
	if (alt !== undefined) {
		const described = await setMediaAlt(actor, item.id, alt);
		if (!described.ok) {
			await deleteMedia(actor, item.id).catch(() => undefined);
			throw new CmsHelperError(
				"MEDIA_UPLOAD",
				`${filename} alt text: ${nativeRefusalOf(described)}`,
			);
		}
	}
	return item as Record<string, unknown> & { id: string };
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
	/** Native SEO panel values ({ title, description, … }) for a collection that supports SEO. */
	seo?: Record<string, unknown>;
}

export interface SyntheticEntryResult {
	result: NativeResult;
	/** Entry id from the native response, registered for owned cleanup. */
	entryId?: string;
	/** `_rev` from the native response, when present. */
	rev?: string;
}

/**
 * A unique synthetic slug. A label names the fixture's role in the slug, so a failure says which
 * fixture it was.
 */
export function syntheticSlug(label?: string): string {
	const role = label === undefined ? "" : `${label}-`;
	return `${SYNTHETIC_SLUG_PREFIX}${role}${crypto.randomUUID().slice(0, 13)}`;
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
	const result = await cmsRequest(actor, `/_emdash/api/content/${encodeURIComponent(collection)}`, {
		method: "POST",
		body: {
			data: input.data,
			slug: input.slug ?? syntheticSlug(),
			...(input.references !== undefined ? { references: input.references } : {}),
			...(input.taxonomies !== undefined ? { taxonomies: input.taxonomies } : {}),
			...(input.seo !== undefined ? { seo: input.seo } : {}),
		},
	});
	const entryId = nativeItemOf(result)?.id;
	const rev = nativeRevOf(result);
	if (result.ok && typeof entryId === "string") {
		registryOf(actor).entries.push({ collection, id: entryId });
		return { result, entryId, rev };
	}
	return { result, rev };
}

/** One Portable Text block of `style` (normal, h2, …), the shape the Admin editor saves. */
export function portableTextBlock(text: string, style = "normal"): Record<string, unknown> {
	const key = crypto.randomUUID().slice(0, 8);
	return {
		_type: "block",
		_key: key,
		style,
		markDefs: [],
		children: [{ _type: "span", _key: `${key}s`, text, marks: [] }],
	};
}

/**
 * An image block for a Portable Text body, the shape the Admin editor saves when staff pick an
 * uploaded media item: its id as `_ref` and its URL, EmDash's media route with the storage key
 * (emdash 1.1.0 src/content/converters/prosemirror-to-portable-text.ts convertImage,
 * src/astro/routes/api/media.ts addUrlToMedia). A failed upload throws.
 */
export function portableTextImage(
	uploaded: SyntheticMediaResult,
	alt: string,
): Record<string, unknown> {
	const item = nativeItemOf(uploaded.result);
	if (uploaded.mediaId === undefined || typeof item?.url !== "string") {
		throw new CmsHelperError("body-image", `the body image: ${nativeRefusalOf(uploaded.result)}`);
	}
	return {
		_type: "image",
		_key: crypto.randomUUID().slice(0, 8),
		asset: { _ref: uploaded.mediaId, url: item.url },
		alt,
	};
}

// ---------------------------------------------------------------------------
// Synthetic public content for the public-page suites
// ---------------------------------------------------------------------------

/** A synthetic draft as a public-page suite keeps it: its id, slug and the title the site shows. */
export interface DraftFixture {
	id: string;
	slug: string;
	title: string;
}

/** What a suite sets on a synthetic draft besides its title: fields, terms, references, SEO. */
export interface DraftFields {
	data?: Record<string, unknown>;
	taxonomies?: Record<string, string[]>;
	references?: Record<string, string[]>;
	seo?: Record<string, unknown>;
}

/** Create a synthetic draft of `collection` under `slug`, shown as `title`. A refusal throws. */
async function createDraftFixture(
	actor: CmsActor,
	collection: string,
	slug: string,
	title: string,
	{ data, ...fields }: DraftFields & { data: Record<string, unknown> },
): Promise<DraftFixture> {
	const created = await createSyntheticEntry(actor, collection, { data, slug, ...fields });
	if (!created.result.ok || created.entryId === undefined) {
		throw new CmsHelperError(
			"synthetic-draft",
			`${collection} ${slug}: ${nativeRefusalOf(created.result)}`,
		);
	}
	return { id: created.entryId, slug, title };
}

/**
 * A synthetic draft of `collection` titled `${mark} ${kind} ${label} ${ending}`, unique by its
 * slug's ending, so a page shows it or does not. `kind` names the content in Thai, such as ข่าว; a
 * public-page suite wraps this once per collection it tests. A refusal throws.
 */
export async function createSyntheticDraft(
	actor: CmsActor,
	collection: string,
	kind: string,
	label: string,
	{ data, ...fields }: DraftFields = {},
): Promise<DraftFixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} ${kind} ${label} ${slug.slice(-6)}`;
	return createDraftFixture(actor, collection, slug, title, {
		data: { title, ...data },
		...fields,
	});
}

/**
 * A synthetic Service draft titled `${mark} ${name} ${label} ${ending}`. A `name` that starts with
 * ก, ข, ค orders the fixtures in Thai whatever their endings.
 */
export async function createSyntheticService(
	actor: CmsActor,
	label: string,
	{ name = "บริการ", ...fields }: DraftFields & { name?: string } = {},
): Promise<DraftFixture> {
	return createSyntheticDraft(actor, "services", name, label, fields);
}

/** A synthetic Document draft with a unique title and `file`, else a synthetic PDF of its own. */
export async function createSyntheticDocument(
	actor: CmsActor,
	label: string,
	{ file, data, ...fields }: DraftFields & { file?: SyntheticPdf } = {},
): Promise<DraftFixture & { file: SyntheticPdf }> {
	const pdf = file ?? (await uploadSyntheticPdf(actor));
	const fixture = await createSyntheticDraft(actor, "documents", "เอกสาร", label, {
		data: { file: pdf.value, ...data },
		...fields,
	});
	return { ...fixture, file: pdf };
}

/**
 * A synthetic Health Report draft. A Health Report requires the Document it describes
 * (seed/seed.json report_document): `document`, else a published synthetic Document made for it.
 */
export async function createSyntheticHealthReport(
	actor: CmsActor,
	label: string,
	{ document, ...fields }: DraftFields & { document?: { id: string } } = {},
): Promise<DraftFixture> {
	let described = document;
	if (described === undefined) {
		described = await createSyntheticDocument(actor, `${label}-document`);
		await publishEntryAt(actor, "documents", described.id);
	}
	return createSyntheticDraft(actor, "health_reports", "รายงานสุขภาพ", label, {
		...fields,
		references: { ...fields.references, report_document: [described.id] },
	});
}

/**
 * A synthetic Health Service draft. Its official name is unique; with `displayName`, the site shows
 * that display name, made unique the same way, instead.
 */
export async function createSyntheticHealthService(
	actor: CmsActor,
	label: string,
	{ displayName, data, ...fields }: DraftFields & { displayName?: string } = {},
): Promise<DraftFixture & { officialName: string }> {
	const slug = syntheticSlug(label);
	const officialName = `${SYNTHETIC_FIXTURE_MARK} หน่วยบริการ ${label} ${slug.slice(-6)}`;
	const shown = displayName && `${SYNTHETIC_FIXTURE_MARK} ${displayName} ${slug.slice(-6)}`;
	const fixture = await createDraftFixture(actor, "health_services", slug, shown || officialName, {
		data: { title: officialName, ...(shown ? { display_name: shown } : {}), ...data },
		...fields,
	});
	return { ...fixture, officialName };
}

// ---------------------------------------------------------------------------
// Synthetic taxonomy terms (native request shapes)
// ---------------------------------------------------------------------------

export interface SyntheticTerm {
	taxonomy: string;
	slug: string;
	label: string;
}

/**
 * Create one term of `taxonomy` labelled exactly `label`, under a synthetic slug, through the
 * native taxonomy API (POST /_emdash/api/taxonomies/{taxonomy}/terms). Terms are not in the
 * owned-fixture registry: the caller keeps them and hands them to deleteSyntheticTerms. A refusal
 * throws.
 */
export async function createSyntheticTerm(
	actor: CmsActor,
	taxonomy: string,
	label: string,
): Promise<SyntheticTerm> {
	const slug = syntheticSlug(taxonomy.replaceAll("_", "-"));
	const created = await cmsRequest(actor, `/_emdash/api/taxonomies/${taxonomy}/terms`, {
		method: "POST",
		body: { slug, label },
	});
	if (!created.ok) {
		throw new CmsHelperError("synthetic-term", `${taxonomy} term: ${nativeRefusalOf(created)}`);
	}
	return { taxonomy, slug, label };
}

/**
 * A synthetic term of `taxonomy` labelled like a real one: `label` behind the synthetic mark, with
 * a unique ending. It is added to `owned`, which the suite hands to deleteSyntheticTerms at its
 * end.
 */
export async function createOwnedTerm(
	actor: CmsActor,
	taxonomy: string,
	label: string,
	owned: SyntheticTerm[],
): Promise<SyntheticTerm> {
	const unique = crypto.randomUUID().slice(0, 6);
	const term = await createSyntheticTerm(
		actor,
		taxonomy,
		`${SYNTHETIC_FIXTURE_MARK} ${label} ${unique}`,
	);
	owned.push(term);
	return term;
}

/** Delete terms through the native taxonomy API. Returns a line for each that was not deleted. */
export async function deleteSyntheticTerms(
	actor: CmsActor,
	terms: ReadonlyArray<Pick<SyntheticTerm, "taxonomy" | "slug">>,
): Promise<string[]> {
	const failures: string[] = [];
	for (const { taxonomy, slug } of terms) {
		const removed = await cmsRequest(
			actor,
			`/_emdash/api/taxonomies/${taxonomy}/terms/${encodeURIComponent(slug)}`,
			{ method: "DELETE" },
		);
		if (!removed.ok) failures.push(`the ${taxonomy} term ${slug}: ${nativeRefusalOf(removed)}`);
	}
	return failures;
}

/**
 * Delete the automatic redirects EmDash made when a test changed an entry's slug away from one of
 * `slugs` (emdash 1.1.0 src/astro/routes/api/redirects/, src/api/schemas/redirects.ts: the list
 * takes `search` and its items carry `source` and `auto`). Returns a line for each that is not
 * deleted.
 */
export async function deleteAutoRedirects(
	actor: CmsActor,
	slugs: readonly string[],
): Promise<string[]> {
	const failures: string[] = [];
	for (const slug of slugs) {
		const listed = await cmsRequest(actor, "/_emdash/api/redirects", {
			searchParams: { search: slug, limit: "100" },
		});
		if (!listed.ok) {
			failures.push(`listing the redirects of ${slug}: ${nativeRefusalOf(listed)}`);
			continue;
		}
		const redirects = nativeItemsOf(listed) as Array<{ id: string; source: string; auto: boolean }>;
		for (const { id, source } of redirects.filter(
			({ source, auto }) => auto && source.endsWith(`/${slug}`),
		)) {
			const removed = await cmsRequest(actor, `/_emdash/api/redirects/${encodeURIComponent(id)}`, {
				method: "DELETE",
			});
			if (!removed.ok) failures.push(`the redirect from ${source}: ${nativeRefusalOf(removed)}`);
		}
	}
	return failures;
}

/**
 * Remove what a suite made, as its afterAll: the redirects left by `movedSlugs`, the actor's owned
 * fixtures, then `terms`, each step attempted whatever the others' outcome, and fail on anything
 * left. An actor that never loaded made nothing.
 */
export async function removeSuiteFixtures(
	actor: CmsActor | undefined,
	{
		terms = [],
		movedSlugs = [],
	}: {
		terms?: ReadonlyArray<Pick<SyntheticTerm, "taxonomy" | "slug">>;
		movedSlugs?: readonly string[];
	} = {},
): Promise<void> {
	if (actor === undefined) return;
	const failures: string[] = [];
	const attempt = async (step: string, run: () => Promise<string[]>) => {
		try {
			failures.push(...(await run()));
		} catch (cause) {
			failures.push(`${step}: ${failureText(cause)}`);
		}
	};
	await attempt("the redirects", () => deleteAutoRedirects(actor, movedSlugs));
	await attempt("the owned fixtures", async () => {
		const report = await cleanupOwnedFixtures(actor, { permanent: true });
		return report.complete ? [] : [`owned fixtures left: ${JSON.stringify(report)}`];
	});
	await attempt("the terms", () => deleteSyntheticTerms(actor, terms));
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
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

/** A published entry as the native content list gives it: its database id and its fields. */
export interface PublishedEntry {
	id: string;
	data?: Record<string, unknown>;
}

/**
 * Every published entry of `collection` on the runtime, through the native content list. It lists
 * entries by `status`, at most 100 a page, with `nextCursor` while more remain (emdash 1.1.0
 * src/api/schemas/content.ts contentListQuery, src/api/schemas/common.ts). A refusal throws.
 */
export async function listPublishedEntries(
	actor: CmsActor,
	collection: string,
): Promise<PublishedEntry[]> {
	const entries: PublishedEntry[] = [];
	let cursor: string | undefined;
	do {
		const listed = await cmsRequest(
			actor,
			`/_emdash/api/content/${encodeURIComponent(collection)}`,
			{
				searchParams: { status: "published", limit: "100", ...(cursor ? { cursor } : {}) },
			},
		);
		if (!listed.ok) {
			throw new CmsHelperError(
				"PUBLISHED_LIST",
				`listing the published ${collection}: ${nativeRefusalOf(listed)}`,
			);
		}
		const data = nativeDataOf(listed) as { items: PublishedEntry[]; nextCursor?: string };
		entries.push(...data.items);
		cursor = data.nextCursor || undefined;
	} while (cursor !== undefined);
	return entries;
}

/**
 * Fresh `_rev` for optimistic-concurrency preconditions (native-editorial
 * contract: "use ... the latest returned `_rev`"). This is the mandatory
 * re-read before retrying an uncertain update/publish/schedule: it fails
 * loudly when the current entry cannot be read, rather than silently
 * reusing a stale token. Tests that want the refusal itself should use
 * readEntry and handle the result.
 */
export async function currentRev(actor: CmsActor, collection: string, id: string): Promise<string> {
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
				...(payload.overrideLock !== undefined ? { overrideLock: payload.overrideLock } : {}),
				...(payload.data !== undefined ? { data: payload.data } : {}),
				...(payload.references !== undefined ? { references: payload.references } : {}),
				...(payload.taxonomies !== undefined ? { taxonomies: payload.taxonomies } : {}),
				...(payload.slug !== undefined ? { slug: payload.slug } : {}),
			},
		},
	);
}

/**
 * POST …/publish — native RBAC/lifecycle checks only; refusals returned. `publishedAt` backdates
 * the publication (emdash 1.1.0 src/astro/routes/api/content/[collection]/[id]/publish.ts).
 */
export async function publishEntry(
	actor: CmsActor,
	collection: string,
	id: string,
	options: RevPrecondition & { publishedAt?: string } = {},
): Promise<NativeResult> {
	const { publishedAt, ...pre } = options;
	const body = preconditionBody(
		pre.rev === undefined ? { ...pre, rev: await currentRev(actor, collection, id) } : pre,
	);
	if (publishedAt !== undefined) body.publishedAt = publishedAt;
	return cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/publish`,
		{ method: "POST", body },
	);
}

/**
 * Publish now, or backdated to `publishedAt`, and return the publication instant EmDash stored,
 * as a page dates the entry. A refusal throws.
 */
export async function publishEntryAt(
	actor: CmsActor,
	collection: string,
	id: string,
	publishedAt?: string,
): Promise<string> {
	const published = await publishEntry(actor, collection, id, { publishedAt });
	if (!published.ok) {
		throw new CmsHelperError("publish", `${collection}/${id}: ${nativeRefusalOf(published)}`);
	}
	const stored = nativeItemOf(await readEntry(actor, collection, id))?.publishedAt;
	if (typeof stored !== "string") {
		throw new CmsHelperError("publish", `${collection}/${id} has no stored publishedAt`);
	}
	return stored;
}

/**
 * POST …/preview-url — the signed preview link of entry `id`, on the actor's origin (emdash 1.1.0
 * src/astro/routes/api/content/[collection]/[id]/preview-url.ts). The link carries the signed
 * token, so a test names it in no message. A refusal throws.
 */
export async function mintPreviewLink(
	actor: CmsActor,
	collection: string,
	id: string,
): Promise<URL> {
	const minted = await cmsRequest(
		actor,
		`/_emdash/api/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	const url = nativeDataOf(minted)?.url;
	if (!minted.ok || typeof url !== "string") {
		throw new CmsHelperError("PREVIEW_URL", `${collection}/${id}: ${nativeRefusalOf(minted)}`);
	}
	return new URL(url, actor.baseUrl);
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
			...(options.overrideLock === true ? { searchParams: { overrideLock: "true" } } : {}),
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
// Site settings and Office Contact plugin settings (#52, #62)
// ---------------------------------------------------------------------------

/**
 * POST /_emdash/api/settings — update the native site settings, as Admin's settings page does. The
 * nested `seo` and `social` objects are patched key by key (emdash 1.1.0 src/settings/index.ts
 * setSiteSettings); only the media references accept `null` (src/api/schemas/settings.ts).
 */
export async function writeSiteSettings(
	actor: CmsActor,
	update: Record<string, unknown>,
): Promise<NativeResult> {
	return cmsRequest(actor, "/_emdash/api/settings", { method: "POST", body: update });
}

/**
 * The Songhealth Office Contact plugin's id (src/lib/office-contact-settings.ts
 * OFFICE_CONTACT_PLUGIN).
 */
export const OFFICE_CONTACT_PLUGIN_ID = "songhealth-office-contact";

/**
 * The Office Contact plugin's settings API (emdash 1.1.0
 * src/astro/routes/api/admin/plugins/[id]/settings.ts). GET answers `{ schema, values }` with
 * `null` for an unset value, and PUT `{ values }` writes the keys it names, deleting one set to
 * `null` (src/api/handlers/plugin-settings.ts).
 */
const OFFICE_CONTACT_SETTINGS_PATH = `/_emdash/api/admin/plugins/${OFFICE_CONTACT_PLUGIN_ID}/settings`;

/** Office Contact values by settings key; `null` is unset. */
export type OfficeContactValues = Record<string, string | number | null>;

/** GET the Office Contact settings: `data.schema` and `data.values`. */
export async function readOfficeContactSettings(actor: CmsActor): Promise<NativeResult> {
	return cmsRequest(actor, OFFICE_CONTACT_SETTINGS_PATH);
}

/** PUT Office Contact values, as Admin's settings form saves them. */
export async function writeOfficeContactSettings(
	actor: CmsActor,
	values: OfficeContactValues,
): Promise<NativeResult> {
	return cmsRequest(actor, OFFICE_CONTACT_SETTINGS_PATH, { method: "PUT", body: { values } });
}

/**
 * Show exactly `values` as Office Contact and `social` as the only `social` handles, and return the
 * function that puts back what was there. A refused read or write throws, after putting back what
 * a half-done write changed.
 *
 * Office Contact comes back exactly. The settings API cannot delete a `social` handle, only empty
 * it (emdash 1.1.0 src/api/schemas/settings.ts), so a handle that was unset comes back empty, which
 * the site shows the same way. Only the networks `social` sets and those already holding a handle
 * are written, so the others stay unset.
 */
export async function showOfficeContact(
	actor: CmsActor,
	values: OfficeContactValues,
	social: Record<string, string>,
): Promise<() => Promise<void>> {
	const [stored, site] = await Promise.all([
		readOfficeContactSettings(actor),
		cmsRequest(actor, "/_emdash/api/settings"),
	]);
	if (!stored.ok || !site.ok) {
		throw new CmsHelperError(
			"OFFICE_CONTACT_READ",
			`Office Contact ${nativeRefusalOf(stored)}, site settings ${nativeRefusalOf(site)}`,
		);
	}
	const before = (nativeDataOf(stored)?.values ?? {}) as OfficeContactValues;
	const socialBefore = (nativeDataOf(site)?.social ?? {}) as Record<string, string>;
	const keys = [...new Set([...Object.keys(before), ...Object.keys(values)])];
	const networks = [...new Set([...Object.keys(social), ...Object.keys(socialBefore)])].filter(
		(network) => social[network] || socialBefore[network],
	);
	const apply = async (contact: OfficeContactValues, handles: Record<string, string>) => {
		const written = await writeOfficeContactSettings(
			actor,
			Object.fromEntries(keys.map((key) => [key, contact[key] ?? null])),
		);
		const set = await writeSiteSettings(actor, {
			social: Object.fromEntries(networks.map((network) => [network, handles[network] ?? ""])),
		});
		if (!written.ok || !set.ok) {
			throw new CmsHelperError(
				"OFFICE_CONTACT_WRITE",
				`Office Contact ${nativeRefusalOf(written)}, site settings ${nativeRefusalOf(set)}`,
			);
		}
	};
	const restore = () => apply(before, socialBefore);
	try {
		await apply(values, social);
	} catch (error) {
		await restore().catch(() => undefined);
		throw error;
	}
	return restore;
}

/**
 * Run `body` with exactly `values` as Office Contact and `social` as the only handles, then
 * restore.
 */
export async function withOfficeContact(
	actor: CmsActor,
	values: OfficeContactValues,
	social: Record<string, string>,
	body: () => Promise<void>,
): Promise<void> {
	const restore = await showOfficeContact(actor, values, social);
	try {
		await body();
	} finally {
		await restore();
	}
}

// ---------------------------------------------------------------------------
// The Homepage menus (#65)
// ---------------------------------------------------------------------------

/**
 * The native menus staff curate the Homepage with (spec #51 "Changes to the Feature 002 model").
 */
export const HOMEPAGE_MENUS = {
	featured: "homepage-featured",
	services: "homepage-services",
	quickAccess: "homepage-quick-access",
} as const;

/**
 * A menu item as staff add it: an entry picked from a collection, which the Admin's content picker
 * saves by the entry's id, or a link with its address typed in (emdash 1.1.0
 * @emdash-cms/admin/dist/index.js handleAddContent, handleAddCustomLink).
 */
export type MenuItemInput =
	{ label: string; collection: string; id: string } | { label: string; url: string };

/** The items to give each named Homepage menu. */
export type HomepageMenuItems = Partial<
	Record<keyof typeof HOMEPAGE_MENUS, readonly MenuItemInput[]>
>;

/** A menu item for an entry, as the Admin's content picker adds it: labelled with its title. */
export function pickedMenuItem(
	collection: string,
	entry: { id: string; title: string },
): MenuItemInput {
	return { label: entry.title, collection, id: entry.id };
}

/**
 * A menu item as GET /_emdash/api/menus/{name} lists it (src/api/schemas/menus.ts menuItemSchema).
 */
interface StoredMenuItem {
	id: string;
	parentId: string | null;
	sortOrder: number;
	type: string;
	label: string;
	referenceCollection: string | null;
	referenceId: string | null;
	customUrl: string | null;
	target: string | null;
	titleAttr: string | null;
	cssClasses: string | null;
}

/** The items of menu `name`, in menu order. A refusal throws. */
async function menuItemsOf(actor: CmsActor, name: string): Promise<StoredMenuItem[]> {
	const read = await cmsRequest(actor, `/_emdash/api/menus/${encodeURIComponent(name)}`);
	if (!read.ok) throw new CmsHelperError("MENU_READ", `menu ${name}: ${nativeRefusalOf(read)}`);
	return (nativeDataOf(read)?.items ?? []) as StoredMenuItem[];
}

/**
 * Give menu `name` exactly `items`, in order: delete what it holds, then create each item, a parent
 * before its children. Deleting an item deletes its children (emdash 1.1.0
 * src/database/migrations/036_i18n_menus_and_taxonomies.ts), so only the top items are deleted. A
 * refusal throws.
 */
async function setMenuItems(
	actor: CmsActor,
	name: string,
	items: ReadonlyArray<Omit<StoredMenuItem, "id"> & { id?: string }>,
): Promise<void> {
	const path = `/_emdash/api/menus/${encodeURIComponent(name)}/items`;
	for (const { id } of (await menuItemsOf(actor, name)).filter((item) => item.parentId === null)) {
		const deleted = await cmsRequest(actor, `${path}/${encodeURIComponent(id)}`, {
			method: "DELETE",
		});
		if (!deleted.ok) {
			throw new CmsHelperError("MENU_WRITE", `menu ${name}: ${nativeRefusalOf(deleted)}`);
		}
	}
	const created = new Map<string, string>();
	let pending = [...items];
	while (pending.length > 0) {
		const ready = pending.filter(({ parentId }) => parentId === null || created.has(parentId));
		if (ready.length === 0) {
			throw new CmsHelperError("MENU_WRITE", `menu ${name}: an item's parent is missing`);
		}
		for (const item of ready) {
			// The create body takes these fields only, and no null (src/api/schemas/menus.ts
			// createMenuItemBody), while a read lists more.
			const body = Object.fromEntries(
				Object.entries({
					type: item.type,
					label: item.label,
					referenceCollection: item.referenceCollection,
					referenceId: item.referenceId,
					customUrl: item.customUrl,
					target: item.target,
					titleAttr: item.titleAttr,
					cssClasses: item.cssClasses,
					parentId: item.parentId === null ? null : created.get(item.parentId),
					sortOrder: item.sortOrder,
				}).filter(([, value]) => value !== null),
			);
			const made = await cmsRequest(actor, path, { method: "POST", body });
			const madeId = nativeDataOf(made)?.id;
			if (!made.ok || typeof madeId !== "string") {
				throw new CmsHelperError("MENU_WRITE", `menu ${name}: ${nativeRefusalOf(made)}`);
			}
			if (item.id !== undefined) created.set(item.id, madeId);
		}
		pending = pending.filter((item) => !ready.includes(item));
	}
}

/**
 * Give each named Homepage menu exactly the given items, and return the function that puts back
 * what each held, trying every menu and throwing for any it could not. A refused read or write
 * throws, after trying to put back what was saved.
 *
 * Each item made carries the synthetic mark as its CSS class, which the Homepage never renders, so
 * the residue scan finds any that a run stopped before putting the menus back leaves
 * (scripts/dev-runtime-residue.sh); what the menus held before is then lost with the run.
 *
 * The menu API has no call that replaces a menu's items; only EmDash's MCP server has one (emdash
 * 1.1.0 src/mcp/server.ts). So the items are deleted and created again: what comes back has the
 * same labels, addresses, targets, classes, nesting and order, under new ids and creation times.
 */
export async function showHomepageMenus(
	actor: CmsActor,
	menus: HomepageMenuItems,
): Promise<() => Promise<void>> {
	const saved = new Map<string, StoredMenuItem[]>();
	for (const key of Object.keys(menus) as Array<keyof typeof HOMEPAGE_MENUS>) {
		saved.set(HOMEPAGE_MENUS[key], await menuItemsOf(actor, HOMEPAGE_MENUS[key]));
	}
	const restore = async () => {
		const failures: string[] = [];
		for (const [name, items] of saved) {
			await setMenuItems(actor, name, items).catch((error: unknown) =>
				failures.push(`menu ${name}: ${failureText(error)}`),
			);
		}
		if (failures.length > 0) throw new CmsHelperError("MENU_RESTORE", failures.join("; "));
	};
	try {
		for (const [key, items] of Object.entries(menus) as Array<
			[keyof typeof HOMEPAGE_MENUS, readonly MenuItemInput[]]
		>) {
			await setMenuItems(
				actor,
				HOMEPAGE_MENUS[key],
				items.map((item, sortOrder) => ({
					parentId: null,
					sortOrder,
					label: item.label,
					titleAttr: null,
					target: null,
					cssClasses: SYNTHETIC_FIXTURE_MARK,
					...("url" in item
						? { type: "custom", customUrl: item.url, referenceCollection: null, referenceId: null }
						: {
								type: item.collection === "pages" ? "page" : "collection",
								referenceCollection: item.collection,
								referenceId: item.id,
								customUrl: null,
							}),
				})),
			);
		}
	} catch (error) {
		await restore().catch(() => undefined);
		throw error;
	}
	return restore;
}

/**
 * Run `body` with exactly the given items in each named Homepage menu, then put back what each
 * held.
 */
export async function withHomepageMenus(
	actor: CmsActor,
	menus: HomepageMenuItems,
	body: () => Promise<void>,
): Promise<void> {
	const restore = await showHomepageMenus(actor, menus);
	try {
		await body();
	} finally {
		await restore();
	}
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
				entryReport.note =
					"still a live entry; the native trash-first path must succeed before purge";
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
		entryReport.resolved =
			absent || (permanent ? entryReport.permanentlyDeleted : entryReport.trashed);
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

/**
 * Clean up the role fixture's owned fixtures, under the Administrator's authority, and the
 * Administrator's, each attempted whatever the other's outcome. Returns a line for each actor whose
 * fixtures are not all resolved.
 */
export async function cleanupRoleFixtureAndAdmin(
	roleFixture: CmsActor | undefined,
	admin: CmsActor | undefined,
): Promise<string[]> {
	const failures: string[] = [];
	for (const [label, owner] of [
		["role-fixture", roleFixture],
		["admin", admin],
	] as const) {
		if (owner === undefined) continue;
		try {
			const report = await cleanupOwnedFixtures(owner, { adminActor: admin, permanent: true });
			if (!report.complete) failures.push(`${label} cleanup left: ${JSON.stringify(report)}`);
		} catch (cause) {
			failures.push(`${label} cleanup: ${failureText(cause)}`);
		}
	}
	return failures;
}

// ---------------------------------------------------------------------------
// Refusal checks the CMS suites share
// ---------------------------------------------------------------------------

/**
 * Fail unless `result` is a native validation refusal, 400 VALIDATION_ERROR (emdash 1.1.0
 * src/api/handlers/validation.ts, src/api/errors.ts mapErrorStatus), so that an authorization,
 * missing-schema or state refusal never passes for one.
 */
export function expectValidationRefusal(result: NativeResult, caseLabel: string): void {
	expect(result.ok, `${caseLabel}: the native save must be refused, not reported as success`).toBe(
		false,
	);
	expect(result.status, `${caseLabel}: a native validation refusal is HTTP 400`).toBe(400);
	expect(
		nativeErrorOf(result)?.code,
		`${caseLabel}: the refusal must carry the native VALIDATION_ERROR code`,
	).toBe("VALIDATION_ERROR");
}

/**
 * Fail unless `result` refuses an unresolvable reference target, 404 with a NOT_FOUND-family code
 * (emdash 1.1.0 src/api/handlers/relations.ts resolveReferenceTargets).
 */
export function expectTargetRefusal(result: NativeResult, caseLabel: string): void {
	expect(result.ok, `${caseLabel}: the native save must be refused, not reported as success`).toBe(
		false,
	);
	expect(result.status, `${caseLabel}: an unresolvable reference target is refused with 404`).toBe(
		404,
	);
	const code = nativeErrorOf(result)?.code;
	expect(
		typeof code === "string" && code.includes("NOT_FOUND"),
		`${caseLabel}: the refusal must carry a native NOT_FOUND-family code`,
	).toBe(true);
}

/**
 * Fail unless `result` is a refusal that is no validation outcome: 401 or 403, with a native error
 * code other than VALIDATION_ERROR. From the content API, an anonymousRequest save gets 403
 * CSRF_REJECTED and a read 401 NOT_AUTHENTICATED (emdash 1.1.0 src/astro/middleware/auth.ts).
 * `request` names what was refused, such as "an unauthenticated native save".
 */
export function expectAuthorizationRefusal(result: NativeResult, request: string): void {
	expect(
		result.status === 401 || result.status === 403,
		`${request} must be refused with 401 or 403`,
	).toBe(true);
	expect(result.ok, `${request} must not be reported as success`).toBe(false);
	const code = nativeErrorOf(result)?.code;
	expect(code, `the refusal of ${request} must carry its native error code`).toBeTruthy();
	expect(code, `the refusal of ${request} must not be mistaken for a validation refusal`).not.toBe(
		"VALIDATION_ERROR",
	);
}

// ---------------------------------------------------------------------------
// Development Admin browser session (Product Owner decision 2026-10-29)
// ---------------------------------------------------------------------------

/**
 * Opt-in switch for the development Admin browser session: set it to
 * `dev-bypass` to let a browser suite sign in through EmDash's own
 * development-only session route. Unset, the gated browser journeys skip
 * with their session prerequisite, as before.
 */
export const ADMIN_SESSION_ENV = "SONGHEALTH_ADMIN_SESSION";

/**
 * The file a browser suite's Admin sessions are recorded in, one "start end" line (Unix seconds)
 * per session, so the development runtime's Admin-activity guard tells a test run's Admin page
 * loads from a person's (scripts/dev-runtime-common.sh admin_page_loads). Unset, nothing is
 * recorded; scripts/dev-runtime-env.sh sets it.
 */
const ADMIN_TEST_SESSIONS_ENV = "SONGHEALTH_ADMIN_TEST_SESSIONS";

/** When each open development Admin session began, by browser context. */
const adminSessionStarts = new WeakMap<object, number>();

/** The minimal browser-context surface the session helpers use. */
export interface SessionContext {
	request: {
		get(url: string): Promise<{ status(): number; json(): Promise<unknown> }>;
		post(url: string, options: { headers: Record<string, string> }): Promise<{ status(): number }>;
	};
}

/** True when the runner opted in to the development Admin session. */
export async function devAdminSessionRequested(): Promise<boolean> {
	return env[ADMIN_SESSION_ENV]?.trim() === "dev-bypass";
}

/**
 * Sign the browser context in as the development administrator through
 * GET /_emdash/api/auth/dev-bypass (pinned 1.1.0, import.meta.env.DEV only).
 * For the existing dev@emdash.local account the route only sets the native
 * session cookie: it inserts nothing, applies no seed and mints no token —
 * unlike the forbidden setup bootstrap /_emdash/api/setup/dev-bypass. The
 * context's request client shares the browser cookie jar, so the page is
 * signed in afterwards. Anything but the dev administrator fails loudly.
 */
export async function openDevAdminSession(context: SessionContext): Promise<void> {
	const response = await context.request.get("/_emdash/api/auth/dev-bypass");
	const body = (await response.json().catch(() => undefined)) as
		{ data?: { user?: { email?: unknown; role?: unknown } } } | undefined;
	const user = body?.data?.user;
	if (response.status() !== 200 || user?.email !== DEV_ADMIN_EMAIL || user?.role !== 50) {
		throw new CmsHelperError(
			"DEV_SESSION_FAILED",
			`the development Admin session was not established (status ${response.status()}); a production build refuses this route by design`,
		);
	}
	adminSessionStarts.set(context, Date.now());
}

/**
 * End the development Admin session through the native logout route
 * (POST /_emdash/api/auth/logout, which destroys the server-side session).
 * Returns the HTTP status so the caller can report a failed logout.
 */
export async function closeDevAdminSession(context: SessionContext): Promise<number> {
	const response = await context.request.post("/_emdash/api/auth/logout", {
		headers: { "X-EmDash-Request": "1" },
	});
	await recordAdminSession(context);
	return response.status();
}

/**
 * Append the context's Admin session window to ADMIN_TEST_SESSIONS_ENV's file, when set.
 */
async function recordAdminSession(context: SessionContext): Promise<void> {
	const start = adminSessionStarts.get(context);
	adminSessionStarts.delete(context);
	const file = env[ADMIN_TEST_SESSIONS_ENV]?.trim();
	if (start === undefined || !file) return;
	const seconds = (ms: number) => (ms / 1000).toFixed(3);
	await appendFile(file, `${seconds(start)} ${seconds(Date.now())}\n`, { mode: 0o600 });
}

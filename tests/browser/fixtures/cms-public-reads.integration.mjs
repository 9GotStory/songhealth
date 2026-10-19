// T021 — development-only Astro integration that injects the Feature 002
// public-read SSR test fixture into the ONE existing persistent development
// server (origin http://127.0.0.1:4322). Test support only: no application,
// schema, seed, dependency, infrastructure, production page or packaging
// change is made here.
//
// Authority:
// - specs/002-cms-content-model/tasks.md T021 ("a development-only
//   integration tests/browser/fixtures/cms-public-reads.integration.mjs …
//   The integration may inject /__feature002/public-reads only in a verified
//   `dev` context through reviewed development-only configuration of the
//   existing server; reject non-dev commands before injection") and the
//   "T021 execution and single-runtime isolation" block (injectRoute guarded
//   before `injectRoute({ pattern: '/__feature002/public-reads', entrypoint:
//   new URL('./cms-public-reads.astro', import.meta.url), prerender: false })`,
//   preserved canonical astro.config.mjs, no production src/pages route, no
//   second server; feasibility/registration NOT proven by the task document)
// - specs/002-cms-content-model/contracts/public-read.md "Verification
//   Boundary" (a development-only SSR fixture requires a reviewed and
//   explicitly authorized integration into the running server's native
//   request context, with production-build exclusion; HOLD rather than
//   bypass when the runtime lacks the approved fixture)
// - AGENTS.md "Single Persistent Development Runtime" (never register a test
//   integration in canonical production configuration; a dev-only
//   integration not yet installed on the persistent source/server is NOT
//   READY → HOLD)
// - docs/website-modernization-docs/current/10-system-blueprint.md §9
//   (Astro SSR uses the EmDash query functions directly; draft preview uses
//   EmDash's signed preview flow)
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// checked through Context7 (/withastro/docs, integrations reference — the
// `astro:config:setup` hook receives `command: 'dev' | 'build' | 'preview' |
// 'sync'` and an `injectRoute({ pattern, entrypoint, prerender? })` callback)
// and then controlled by the PINNED astro@7.3.5 first-party package source
// (node_modules/astro/dist/integrations/hooks.js:123–188): `command` is
// passed into the hook options and `injectRoute` records
// `{ ...injectRoute, origin: "external" }` on the settings' injectedRoutes.
// EmDash 1.1.0 registers its runtime/auth/request-context middleware with
// order "pre" (node_modules/emdash/src/astro/integration/index.ts:369–382),
// so an injected route passes through the SAME native middleware chain as
// every other route — the fixture page's native query calls run inside the
// authentic per-request ALS context established by
// emdash/src/astro/middleware/request-context.ts.
//
// Registration lifecycle (tasks.md / Lead handoff; NOT proven here):
// this file only DEFINES the integration. Installing it on the persistent
// development server requires the account-private development configuration
// (config/astro.dev.config.mjs) to append `cmsPublicReadsIntegration()` to
// the existing integrations, through the separately reviewed
// controller-compatible source/config maintenance procedure and Product
// Owner authorization. Do not assume HMR/reload installs it: a config-level
// integration is evaluated at server startup, so installation needs the
// approved source/config transition (including any restart), not a hot
// reload. Until then the route is absent and every consumer must HOLD.
//
// Server-only input (the route access boundary; provisioning deferred to
// the separately authorized maintenance):
// - SONGHEALTH_T021_ROUTE_TOKEN: a non-empty secret string held ONLY in the
//   application server's environment (never in the repository, client
//   bundles, logs or evidence). The injected route refuses EVERY request —
//   before any data read — unless the request presents the matching token in
//   the x-songhealth-t021-route-access header. When the variable is absent
//   the route still fails closed (503 ROUTE_ACCESS_UNPROVISIONED): the
//   token, and the mode-0600 client-side copy the coordinated tests read
//   through SONGHEALTH_T021_ROUTE_ACCESS, are provisioned together by that
//   maintenance procedure. Host/Origin strings are deliberately NOT the
//   boundary: they are spoofable inside container networks.

/** The single reserved route pattern this integration may inject. */
export const T021_ROUTE_PATTERN = "/__feature002/public-reads";

/** Header carrying the coordinated test's route access token. */
export const T021_ROUTE_ACCESS_HEADER = "x-songhealth-t021-route-access";

/** Server-only env var holding the route access token (fail-closed input). */
export const T021_ROUTE_TOKEN_ENV = "SONGHEALTH_T021_ROUTE_TOKEN";

/** Stable identity the fixture page reports on its `probe` case. */
export const T021_FIXTURE_ID = "songhealth:t021:cms-public-reads";

/** Fixture contract version (bump on any breaking route-contract change). */
export const T021_FIXTURE_VERSION = 1;

/**
 * The only collections the fixture route may read. Bounded to the live
 * Feature 002 seed schema (seed/seed.json slugs); the route never exposes a
 * generic "any collection" query surface.
 */
export const T021_ALLOWED_COLLECTIONS = Object.freeze([
	"documents",
	"pages",
	"news",
	"activities",
	"announcements",
	"health_content",
	"services",
	"health_reports",
]);

/**
 * The only reference field slugs the fixture route may hydrate per
 * collection (seed/seed.json reference bindings). Unknown fields are
 * refused before any read.
 */
export const T021_REFERENCE_FIELDS = Object.freeze({
	documents: Object.freeze(["successor"]),
	pages: Object.freeze(["documents"]),
	announcements: Object.freeze(["documents"]),
	services: Object.freeze(["documents"]),
	health_reports: Object.freeze(["report_document"]),
});

/** Longest accepted opaque pagination cursor (defense in depth). */
export const T021_MAX_CURSOR_LENGTH = 512;

/** Longest accepted entry id or slug (locale-prefixed ids included). */
export const T021_MAX_ID_LENGTH = 255;

/**
 * Resolve one incoming fixture-route request against the access boundary and
 * the bounded input contract — WITHOUT performing any native query. The
 * .astro fixture delegates to this before it touches the EmDash helpers, so
 * the boundary itself stays plain ESM (importable by the offline controls)
 * and the page stays thin.
 *
 * Fail-closed order: access token first (403/503 before anything else, no
 * data read), then method (405), then the bounded input contract (400).
 * `unprovisioned` is returned when the server-side token env is absent; the
 * page maps that to 503 so the coordinator can distinguish "integration not
 * installed" (404) from "installed but access capability not provisioned".
 */
export async function resolveT021FixtureRequest(request, url, env) {
	const serverToken = env[T021_ROUTE_TOKEN_ENV];
	if (typeof serverToken !== "string" || serverToken.length === 0) {
		return { status: 503, body: { error: "ROUTE_ACCESS_UNPROVISIONED" } };
	}
	const presented =
		request.headers.get(T021_ROUTE_ACCESS_HEADER) ??
		request.headers.get(T021_ROUTE_ACCESS_HEADER.toUpperCase());
	if (presented === null || presented.length === 0) {
		return { status: 403, body: { error: "ROUTE_ACCESS_DENIED" } };
	}
	if (!(await constantTimeEquals(presented, serverToken))) {
		return { status: 403, body: { error: "ROUTE_ACCESS_DENIED" } };
	}
	if (request.method !== "GET") {
		return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
	}
	const params = url.searchParams;
	const queryCase = params.get("case") ?? "probe";
	switch (queryCase) {
		case "probe":
			return {
				status: 200,
				body: {
					case: "probe",
					fixtureId: T021_FIXTURE_ID,
					fixtureVersion: T021_FIXTURE_VERSION,
					route: T021_ROUTE_PATTERN,
					ready: true,
				},
			};
		case "collection": {
			const collection = params.get("collection");
			if (collection === null || !T021_ALLOWED_COLLECTIONS.includes(collection)) {
				return { status: 400, body: { error: "UNKNOWN_COLLECTION" } };
			}
			const forbidden = forbiddenFilterParams(params);
			if (forbidden !== undefined) {
				return { status: 400, body: { error: "FORBIDDEN_FILTER", param: forbidden } };
			}
			const limit = optionalLimit(params);
			if (limit.error !== undefined) {
				return { status: 400, body: { error: "INVALID_LIMIT", param: limit.error } };
			}
			const cursor = optionalCursor(params);
			if (cursor.error !== undefined) {
				return { status: 400, body: { error: "INVALID_CURSOR", param: cursor.error } };
			}
			return {
				status: 200,
				body: {
					query: { kind: "collection", collection, limit: limit.value, cursor: cursor.value },
				},
			};
		}
		case "entry":
		case "entry-with-references":
		case "references": {
			const collection = params.get("collection");
			if (collection === null || !T021_ALLOWED_COLLECTIONS.includes(collection)) {
				return { status: 400, body: { error: "UNKNOWN_COLLECTION" } };
			}
			const id = params.get("id");
			if (
				id === null ||
				id.length === 0 ||
				id.length > T021_MAX_ID_LENGTH ||
				!/^[A-Za-z0-9][A-Za-z0-9._~:/-]*$/.test(id)
			) {
				return { status: 400, body: { error: "INVALID_ID" } };
			}
			let field;
			if (queryCase !== "entry") {
				field = params.get("field");
				const allowed = T021_REFERENCE_FIELDS[collection] ?? [];
				if (field === null || !allowed.includes(field)) {
					return { status: 400, body: { error: "UNKNOWN_REFERENCE_FIELD" } };
				}
			}
			const forbidden = forbiddenFilterParams(params);
			if (forbidden !== undefined) {
				return { status: 400, body: { error: "FORBIDDEN_FILTER", param: forbidden } };
			}
			const limit = optionalLimit(params);
			if (limit.error !== undefined) {
				return { status: 400, body: { error: "INVALID_LIMIT", param: limit.error } };
			}
			const cursor = optionalCursor(params);
			if (cursor.error !== undefined) {
				return { status: 400, body: { error: "INVALID_CURSOR", param: cursor.error } };
			}
			return {
				status: 200,
				body: {
					query: {
						kind: queryCase,
						collection,
						id,
						...(field !== undefined ? { field } : {}),
						limit: limit.value,
						cursor: cursor.value,
					},
				},
			};
		}
		default:
			return { status: 400, body: { error: "UNKNOWN_CASE" } };
	}
}

/**
 * Filter inputs the route never accepts, so it cannot be coerced into a
 * draft listing or an arbitrary-value query: the published-only native
 * default is the only visibility this fixture ever asks for. Returns the
 * first offending parameter name, or undefined.
 */
function forbiddenFilterParams(params) {
	for (const name of ["status", "where", "orderBy", "locale", "draft"]) {
		if (params.has(name)) {
			return name;
		}
	}
	return undefined;
}

/**
 * Bounded optional limit: an integer 1..100. Returns { value } (undefined
 * when absent) or { error } naming the offending parameter.
 */
function optionalLimit(params) {
	const raw = params.get("limit");
	if (raw === null) {
		return { value: undefined };
	}
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isInteger(parsed) || String(parsed) !== raw.trim() || parsed < 1 || parsed > 100) {
		return { error: "limit" };
	}
	return { value: parsed };
}

/**
 * Bounded opaque cursor: a non-empty string of sane length. Returns { value }
 * (undefined when absent) or { error }. Cursors are passed through to the
 * native helper untouched.
 */
function optionalCursor(params) {
	const raw = params.get("cursor");
	if (raw === null) {
		return { value: undefined };
	}
	if (raw.length === 0 || raw.length > T021_MAX_CURSOR_LENGTH) {
		return { error: "cursor" };
	}
	return { value: raw };
}

/**
 * Constant-time string equality for the route access token, on Web Crypto
 * (available in the dev server runtime and in Node 24): compare fixed-length
 * SHA-256 digests, accumulating the XOR of every byte before deciding.
 */
async function constantTimeEquals(a, b) {
	const digest = async (text) => {
		const bytes = new TextEncoder().encode(text);
		const view = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
		return view;
	};
	const [left, right] = await Promise.all([digest(a), digest(b)]);
	let difference = left.length ^ right.length;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}
	return difference === 0;
}

/**
 * The development-only test integration. Injects the reserved public-read
 * fixture route in the `dev` command ONLY; every other command — build,
 * preview, sync, and any unknown value — is rejected BEFORE injection, so
 * the route never exists in a production build, a preview server or a
 * type-sync pass.
 *
 * Failure behavior: this integration throws only for a misconfigured
 * injection state it cannot truthfully report (never for non-dev commands,
 * which are the expected refusals logged and skipped). Access failures are
 * per-request in the page (fail closed there), not startup failures: a dev
 * server started without SONGHEALTH_T021_ROUTE_TOKEN still boots, and the
 * route answers 503 until the capability is provisioned.
 */
export function cmsPublicReadsIntegration() {
	return {
		name: "songhealth-t021-cms-public-reads",
		hooks: {
			"astro:config:setup"(options) {
				const { command, injectRoute, logger } = options;
				if (command !== "dev") {
					logger.info(
						`songhealth T021 public-read fixture: command "${command}" is not dev — route injection refused (development-only test integration)`,
					);
					return;
				}
				injectRoute({
					pattern: T021_ROUTE_PATTERN,
					entrypoint: new URL("./cms-public-reads.astro", import.meta.url),
					prerender: false,
				});
			},
		},
	};
}

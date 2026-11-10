// What the Thai search UAT's proxy forwards to the development runtime (#238; the Product Owner's
// decisions in #238 comment 6762442208). The proxy answers the public internet through a Tailscale
// Funnel, while the runtime runs `astro dev`, where anyone who reaches `auth/dev-bypass` is signed
// in as an administrator. scripts/uat-proxy.ts serves these rules. The module imports nothing, so
// node:test checks it directly (tests/node/uat-proxy.test.ts).

/** What the proxy does with one request: forward it to `path` upstream, or answer `status`. */
export type Decision =
	{ forward: true; path: string } | { forward: false; status: 400 | 403 | 405; reason: string };

/** The development runtime's origin, the only one the proxy forwards to. */
export const UPSTREAM_ORIGIN = "http://127.0.0.1:4324";

/** The methods the proxy forwards: reading only. */
const READ_METHODS = new Set(["GET", "HEAD"]);

/** Where EmDash serves a media file by its storage key (`./src/lib/media.ts`). */
const MEDIA_FILE_PREFIX = "/_emdash/api/media/file/";

/**
 * A storage key EmDash reads from storage: the flat `{ulid}{ext}` shape, as emdash 1.1.0
 * src/media/image-endpoint.ts `isSafeTransformKey` matches it.
 */
const MEDIA_KEY = /^[A-Za-z0-9._-]+$/;

/** Whether `path`, with no query, is a media file's address. */
function isMediaFile(path: string): boolean {
	return path.startsWith(MEDIA_FILE_PREFIX) && MEDIA_KEY.test(path.slice(MEDIA_FILE_PREFIX.length));
}

/**
 * Whether `href` names a media file on the runtime, absolute as the pages give it or relative, and
 * in the form the URL parser leaves as it is. EmDash reads such a file from storage; Astro 7.3.5's
 * stock endpoint, which EmDash hands every other href, fetches a relative href from the server on
 * the request's origin and with its headers (astro dist/assets/endpoint/generic.js; emdash 1.1.0
 * src/astro/image-endpoint.ts), so `/_image?href=/_emdash/api/setup/dev-bypass` would apply the
 * seed again.
 */
function isMediaFileHref(href: string): boolean {
	if (href.includes("\\")) return false;
	let url: URL;
	try {
		url = new URL(href, UPSTREAM_ORIGIN);
	} catch {
		return false;
	}
	return (
		url.origin === UPSTREAM_ORIGIN &&
		(href === url.pathname || href === url.href) &&
		isMediaFile(url.pathname)
	);
}

/**
 * A percent-encoded ASCII character. Astro 7.3.5 decodes a path with `decodeURI`, again until it
 * stops changing, before it matches a route (astro dist/core/routing/match-request.js
 * `safeDecodePathname`, dist/core/util/pathname.js `validateAndDecodePathname`), so
 * `/_%65mdash/admin` reaches the Admin. A path with Thai characters encodes only bytes from 0x80.
 */
const ENCODED_ASCII = /%[0-7][0-9a-f]/i;

/**
 * Whether `path` reaches the route it reads as: an origin-form path that names no other host, with
 * no backslash, no `.` or `..` segment the URL parser would resolve, and no encoded ASCII character
 * the runtime would decode.
 */
function isPlainPath(path: string): boolean {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	if (ENCODED_ASCII.test(path)) return false;
	return new URL(path, "http://127.0.0.1").pathname === path;
}

/**
 * Whether `path`, in lower case, is one only the runtime's dev server answers and no public page
 * loads. Vite 8.3.3 serves any file under its root, `/src` in the runtime, by its path and by
 * `/@fs/` and `/@id/` (vite dist/node/chunks/node.js `serveStaticMiddleware`,
 * `serveRawFsMiddleware`, `VALID_ID_PREFIX`), and the runtime keeps the media store at `/src/media`
 * (deploy/dev-quadlet/songhealth-dev-app.container), so it would serve stored files outside
 * EmDash's media route and its checks. Its `/__open-in-editor` starts a program on the server. A
 * page loads only `/@vite/client` of these.
 */
function isDevServerPath(path: string): boolean {
	if (path === "/@vite/client") return false;
	return (
		path.startsWith("/@") ||
		path.startsWith("/__") ||
		path === "/media" ||
		path.startsWith("/media/")
	);
}

/** What the proxy does with a request of `method` for `target`, its request line's target. */
export function decide(method: string, target: string): Decision {
	if (!READ_METHODS.has(method)) {
		return { forward: false, status: 405, reason: "only GET and HEAD are answered" };
	}
	const path = target.split("?", 1)[0];
	if (!isPlainPath(path)) {
		return { forward: false, status: 400, reason: "the target is not a plain path" };
	}
	// Every /_emdash path but a media file, in any letter case: the Admin, its API and both
	// development-only dev-bypass routes, which sign anyone in or apply the seed again.
	if (path.toLowerCase().startsWith("/_emdash") && !isMediaFile(path)) {
		return { forward: false, status: 403, reason: "/_emdash answers only media files" };
	}
	if (path.toLowerCase().startsWith("/_image")) {
		const hrefs = new URLSearchParams(target.slice(path.length + 1)).getAll("href");
		if (hrefs.length !== 1 || !isMediaFileHref(hrefs[0])) {
			return { forward: false, status: 403, reason: "/_image answers only media files" };
		}
	}
	if (isDevServerPath(path.toLowerCase())) {
		return { forward: false, status: 403, reason: "the dev server's own paths are not public" };
	}
	return { forward: true, path: target };
}

/** Request or response headers as Node's `http` module gives them, names in lower case. */
export type HeaderMap = Record<string, string | string[] | undefined>;

/**
 * The request headers a page, a picture or a download needs, which reach the runtime as sent.
 * Every other one stays behind: a cookie or a credential, so each request reaches the runtime as
 * an anonymous visitor's; the `X-Forwarded-*` and `Forwarded` headers; and an upgrade, so no
 * WebSocket reaches the Vite server.
 */
const READING_HEADERS = [
	"accept",
	"accept-encoding",
	"accept-language",
	"cache-control",
	"if-modified-since",
	"if-none-match",
	"range",
	"referer",
	"user-agent",
];

/**
 * The headers sent upstream for a request with `headers`: its reading headers, and Host
 * 127.0.0.1:4324 whatever it carried (#218 item 1). The runtime's Vite server refuses another Host
 * with 403 "Blocked request", and the pages build their picture addresses from it.
 */
export function upstreamHeaders(headers: HeaderMap): Record<string, string> {
	const sent: Record<string, string> = {};
	for (const name of READING_HEADERS) {
		const value = headers[name];
		if (typeof value === "string") sent[name] = value;
	}
	sent.host = new URL(UPSTREAM_ORIGIN).host;
	return sent;
}

/** The headers that describe one connection, not the response (RFC 9110 §7.6.1). */
const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
]);

/** The runtime's response headers as the proxy sends them on: all but the hop-by-hop ones. */
export function responseHeaders(headers: HeaderMap): Record<string, string | string[]> {
	const sent: Record<string, string | string[]> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined && !HOP_BY_HOP.has(name)) sent[name] = value;
	}
	return sent;
}

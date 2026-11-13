// What the Thai search UAT's proxy forwards to the development runtime and what it refuses (#238):
// only GET and HEAD, no /_emdash path but a media file, no /_image of anything else, and always as
// Host 127.0.0.1:4324. scripts/uat-proxy.ts serves these rules; scripts/dev-runtime-uat.sh checks
// them again through the running proxy and the public URL.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decide, responseHeaders, upstreamHeaders } from "../../scripts/uat-proxy/policy.ts";

const PAGE = "/search?q=%E0%B8%A7%E0%B8%B1%E0%B8%84%E0%B8%8B%E0%B8%B5%E0%B8%99";

describe("UAT proxy: methods", () => {
	it("forwards GET and HEAD of a public page with its query as sent", () => {
		assert.deepEqual(decide("GET", PAGE), { forward: true, path: PAGE });
		assert.deepEqual(decide("HEAD", PAGE), { forward: true, path: PAGE });
	});

	it("refuses every method but GET and HEAD", () => {
		for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT", "get"]) {
			assert.deepEqual(
				decide(method, "/"),
				{ forward: false, status: 405, reason: "only GET and HEAD are answered" },
				method,
			);
		}
	});
});

/** A media file's address as the public pages give it (src/lib/media.ts). */
const MEDIA_FILE = "/_emdash/api/media/file/01M6NDD56KWYA3M3218QYMR6GR.jpg";

describe("UAT proxy: /_emdash", () => {
	it("forwards a media file the public pages load", () => {
		assert.deepEqual(decide("GET", MEDIA_FILE), { forward: true, path: MEDIA_FILE });
		assert.deepEqual(decide("HEAD", `${MEDIA_FILE}?download=1`), {
			forward: true,
			path: `${MEDIA_FILE}?download=1`,
		});
	});

	it("refuses the Admin, both dev-bypass routes and every other /_emdash path", () => {
		for (const target of [
			"/_emdash/admin",
			"/_emdash/admin/",
			"/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin",
			"/_emdash/api/setup/dev-bypass",
			"/_emdash",
			"/_emdash/",
			"/_EMDASH/admin",
			"/_emdash/api/media/file",
			"/_emdash/api/media/file/",
			"/_emdash/api/media/file/a/b.jpg",
			"/_emdash/api/media/upload-url",
			"/_emdash/api/search?q=x",
		]) {
			assert.deepEqual(
				decide("GET", target),
				{ forward: false, status: 403, reason: "/_emdash answers only media files" },
				target,
			);
		}
	});
});

describe("UAT proxy: the Vite server's own paths", () => {
	it("forwards the dev server's paths a public page loads, and a path that only starts the same", () => {
		for (const target of [
			"/@vite/client",
			"/node_modules/vite/dist/client/env.mjs",
			"/src/styles/global.css?direct",
			"/_astro/fonts/font-noto-sans-thai-400-normal-8a1ab9da7e233587.woff2",
			"/media-centre",
			"/mediation",
		]) {
			assert.deepEqual(decide("GET", target), { forward: true, path: target }, target);
		}
	});

	it("refuses the media store as Vite serves it, and every other path only the dev server answers", () => {
		for (const target of [
			"/media",
			"/media/",
			"/media/01M6NDD56KWYA3M3218QYMR6GR.jpg",
			"/MEDIA/01M6NDD56KWYA3M3218QYMR6GR.jpg",
			"/media/.songhealth-qdev-media-store",
			"/__open-in-editor",
			"/__open-in-editor?file=astro.config.mjs",
			"/__open-in-editor/x",
			"/@fs/src/media/01M6NDD56KWYA3M3218QYMR6GR.jpg",
			"/@FS/src/media/01M6NDD56KWYA3M3218QYMR6GR.jpg?raw",
			"/@id//src/media/01M6NDD56KWYA3M3218QYMR6GR.jpg?raw",
			"/@vite/env",
			"/@vite/client/x",
			"/__vite_ping",
			"/__feature002/public-reads",
		]) {
			assert.deepEqual(
				decide("GET", target),
				{ forward: false, status: 403, reason: "the dev server's own paths are not public" },
				target,
			);
		}
	});
});

describe("UAT proxy: targets", () => {
	it("forwards a path with Thai characters percent-encoded, as browsers send it", () => {
		for (const target of ["/news/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7?page=2", "/news/%80"]) {
			assert.deepEqual(decide("GET", target), { forward: true, path: target }, target);
		}
	});

	it("refuses a target that is not a plain path, or that a server would read as another path", () => {
		for (const target of [
			"*",
			"http://evil.example/",
			"//evil.example/_emdash/admin",
			"/\\evil.example/_emdash/admin",
			"/news/../_emdash/admin",
			"/news/./x",
			"/news/%2e%2e/_emdash/admin",
			"/news/%2E%2E/_emdash/admin",
			"/news/..%2f_emdash/admin",
			"/news/..%2F_emdash/admin",
			"/news/..%5c_emdash/admin",
			"/news%00",
			"/news/%252e%252e/_emdash/admin",
			"/news#x",
			"/_emdash/api/media/file/..",
			"/_emdash/api/media/file/%2e%2e",
			// A percent-encoded ASCII character, which the runtime decodes before it routes.
			"/_%65mdash/api/setup/dev-bypass",
			"/%5Femdash/admin",
			"/_%69mage?href=%2F_emdash%2Fapi%2Fsetup%2Fdev-bypass&w=64",
			"/news/%41",
			"/news/%7e",
			"/news/%7F",
		]) {
			assert.deepEqual(
				decide("GET", target),
				{ forward: false, status: 400, reason: "the target is not a plain path" },
				target,
			);
		}
	});
});

/** An /_image request for `href`, with the transform the public pages ask for. */
function image(href: string): string {
	return `/_image?href=${encodeURIComponent(href)}&w=640&h=905&f=webp&fit=cover&position=center`;
}

describe("UAT proxy: /_image", () => {
	it("forwards /_image for a media file's href, absolute as the pages give it or relative", () => {
		for (const target of [image(`http://127.0.0.1:4324${MEDIA_FILE}`), image(MEDIA_FILE)]) {
			assert.deepEqual(decide("GET", target), { forward: true, path: target }, target);
		}
	});

	it("refuses /_image for any other href, which the server would fetch itself", () => {
		for (const target of [
			image("/_emdash/api/setup/dev-bypass"),
			image("http://127.0.0.1:4324/_emdash/api/auth/dev-bypass?redirect=/"),
			image("/@fs/src/package.json"),
			image("/news"),
			image("http://evil.example/_emdash/api/media/file/x.jpg"),
			image("//evil.example/_emdash/api/media/file/x.jpg"),
			image("https://127.0.0.1:4324/_emdash/api/media/file/x.jpg"),
			image(`${MEDIA_FILE}/../../../setup/dev-bypass`),
			image("/_emdash/api/media/file/../../setup/dev-bypass"),
			image(`${MEDIA_FILE}?x=1`),
			image("\\_emdash/api/media/file/x.jpg"),
			"/_image?w=640",
			`${image(MEDIA_FILE)}&href=${encodeURIComponent("/_emdash/api/setup/dev-bypass")}`,
			image("/_emdash/api/setup/dev-bypass").replace("/_image", "/_IMAGE"),
			image("/_emdash/api/setup/dev-bypass").replace("/_image", "/_image/"),
		]) {
			assert.deepEqual(
				decide("GET", target),
				{ forward: false, status: 403, reason: "/_image answers only media files" },
				target,
			);
		}
	});
});

describe("UAT proxy: headers", () => {
	/** The headers a browser sends to read a page, which reach the runtime as they are. */
	const READING = {
		accept: "text/html",
		"accept-encoding": "gzip, br",
		"accept-language": "th-TH,th;q=0.9",
		"cache-control": "no-cache",
		"if-modified-since": "Mon, 10 Nov 2025 00:00:00 GMT",
		"if-none-match": '"abc"',
		range: "bytes=0-99",
		referer: "https://songhealth-uat.example.ts.net/news",
		"user-agent": "Mozilla/5.0",
	};

	it("sends Host 127.0.0.1:4324 whatever the request carries, with the reading headers as sent", () => {
		assert.deepEqual(upstreamHeaders({ ...READING, host: "songhealth-uat.example.ts.net" }), {
			...READING,
			host: "127.0.0.1:4324",
		});
	});

	it("sends no cookie, credential, forwarding, origin or upgrade header", () => {
		assert.deepEqual(
			upstreamHeaders({
				...READING,
				host: "evil.example",
				cookie: "emdash-session=x",
				authorization: "Bearer x",
				"x-forwarded-host": "evil.example",
				"x-forwarded-for": "203.0.113.1",
				"x-forwarded-proto": "https",
				forwarded: "host=evil.example",
				origin: "https://evil.example",
				upgrade: "websocket",
				connection: "Upgrade",
				"sec-websocket-key": "x",
				"x-http-method-override": "POST",
				"set-cookie": ["a=1"],
			}),
			{ ...READING, host: "127.0.0.1:4324" },
		);
	});

	it("passes the runtime's response headers back without the hop-by-hop ones", () => {
		const kept = {
			"content-type": "text/html",
			"cache-control": "public, max-age=0, must-revalidate",
			etag: '"abc"',
			location: "/news",
			"set-cookie": ["a=1"],
		};
		assert.deepEqual(
			responseHeaders({
				...kept,
				connection: "keep-alive",
				"keep-alive": "timeout=5",
				"transfer-encoding": "chunked",
				upgrade: "h2c",
				"proxy-authenticate": "Basic",
				trailer: "x",
			}),
			kept,
		);
	});
});

// The deployed-stack check through the proxy (#458; spec #450 "Testing Decisions": one script of
// plain requests at the site's real name, its request list planned under node:test). The
// planning module is scripts/stack-check/plan.ts; scripts/stack-check.ts sends the requests.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	ADMIN_UPLOAD_BYTES,
	BODY_LIMIT_BYTES,
	type Answer,
	type Check,
	IMAGE_REFUSAL_MARK,
	judge,
	parseOptions,
	plan,
	SITE_NAME,
} from "../../scripts/stack-check/plan.ts";

const OPTIONS = {
	inside: { address: "192.0.2.9", port: 443 },
	outside: { address: "127.0.0.1", port: 8443 },
};
const MEDIA = `https://${SITE_NAME}/_emdash/api/media/file/`;

function byId(checks: readonly Check[], id: string): Check {
	const check = checks.find((each) => each.id === id);
	assert.ok(check, `no check ${id}`);
	return check;
}

/** The /_image query the Admin builds for a thumbnail (`getMediaThumbnailUrl`), around an href. */
function imageQuery(href: string): string {
	return `?${new URLSearchParams({ href, w: "80", f: "webp" }).toString()}`;
}

describe("the command's options", () => {
	it("takes the inside and outside addresses, a port after the last colon, and IPv6 in brackets", () => {
		assert.deepEqual(
			parseOptions(["--inside", "192.0.2.9", "--outside", "127.0.0.1:8443", "--ca", "ca.crt"]),
			{ ...OPTIONS, ca: "ca.crt" },
		);
		assert.deepEqual(parseOptions(["--inside", "[2001:db8::9]:4443", "--outside", "2001:db8::1"]), {
			inside: { address: "2001:db8::9", port: 4443 },
			outside: { address: "2001:db8::1", port: 443 },
		});
	});

	it("takes another system's site name for the host-level check", () => {
		const options = parseOptions([
			...["--inside", "a.example", "--outside", "b.example"],
			"--other-site",
			"other.example",
		]);
		assert.equal("error" in options ? options.error : options.otherSite, "other.example");
	});

	it("refuses a missing address, an unknown option, a bad port and the site's own name as the other site", () => {
		for (const argv of [
			["--inside", "192.0.2.9"],
			["--outside", "127.0.0.1"],
			["--inside", "a", "--outside", "b", "--verbose"],
			["--inside", "a:0", "--outside", "b"],
			["--inside", "a:65536", "--outside", "b"],
			["--inside", "a:44x", "--outside", "b"],
			["--inside", "a", "--outside", "b", "--other-site", SITE_NAME],
			["--inside", "a", "--outside", "b", "--ca"],
		]) {
			const options = parseOptions(argv);
			assert.ok("error" in options, `accepted ${argv.join(" ")}`);
			assert.match(options.error, /usage: node scripts\/stack-check\.ts/);
		}
	});
});

describe("the requests the check sends", () => {
	const checks = plan(OPTIONS);

	it("sends every request at the site's real name unless it tests another name", () => {
		for (const check of checks.filter((each) => !["H1", "H2", "H3"].includes(each.id))) {
			assert.equal(check.sni, SITE_NAME, check.id);
			assert.equal(check.host, SITE_NAME, check.id);
		}
	});

	it("reads that the homepage and the Admin's sign-in page answer from inside", () => {
		assert.deepEqual(
			[byId(checks, "S1"), byId(checks, "S2")].map(({ from, method, path, expect }) => ({
				from,
				method,
				path,
				expect,
			})),
			[
				{
					from: "inside",
					method: "GET",
					path: "/",
					expect: {
						kind: "status",
						status: 200,
						mark: '<meta name="songhealth-foundation" content="public-runtime"',
					},
				},
				{
					from: "inside",
					method: "GET",
					path: "/_emdash/admin/login",
					expect: { kind: "status", status: 200 },
				},
			],
		);
	});

	it("sends the homepage's request from outside the allowed network, where the site closes it after the TLS handshake", () => {
		const outside = byId(checks, "P1");
		const inside = byId(checks, "S1");
		assert.deepEqual(
			{ ...outside, id: inside.id, what: inside.what, from: "inside", expect: inside.expect },
			inside,
		);
		assert.equal(outside.from, "outside");
		assert.deepEqual(outside.expect, { kind: "closedAfterTls" });
	});

	it("closes before anything else from outside: a picture's redirect and an oversized body are closed too", () => {
		const redirect = byId(checks, "P2");
		assert.equal(redirect.from, "outside");
		assert.equal(redirect.path, byId(checks, "R1").path);
		assert.deepEqual(redirect.expect, { kind: "closedAfterTls" });
		const body = byId(checks, "P3");
		assert.equal(body.path, byId(checks, "B1").path);
		assert.equal(body.from, "outside");
		assert.equal(body.contentLength, BODY_LIMIT_BYTES + 1);
		assert.deepEqual(body.expect, { kind: "closedAfterTls" });
	});

	it("closes another host name, under the site's certificate or under its own name", () => {
		const forged = byId(checks, "H1");
		assert.deepEqual(
			[forged.sni, forged.host, forged.expect],
			[SITE_NAME, "stack-check.invalid", { kind: "closedAfterTls" }],
		);
		const unknown = byId(checks, "H2");
		assert.deepEqual(
			[unknown.sni, unknown.host, unknown.expect],
			["stack-check.invalid", "stack-check.invalid", { kind: "closed" }],
		);
		assert.equal(unknown.verifyCertificate, false);
	});

	it("answers the site's name in capitals as the site", () => {
		const upper = byId(checks, "H3");
		assert.deepEqual(
			[upper.sni, upper.host, upper.expect],
			[SITE_NAME, SITE_NAME.toUpperCase(), byId(checks, "S1").expect],
		);
	});

	it("asks another system's site under its own name only when one is named", () => {
		assert.equal(
			checks.find((each) => each.id === "O1"),
			undefined,
		);
		const other = byId(plan({ ...OPTIONS, otherSite: "other.example" }), "O1");
		assert.deepEqual(
			[other.sni, other.host, other.verifyCertificate, other.expect],
			["other.example", "other.example", false, { kind: "answered" }],
		);
	});

	it("refuses /_image in every spelling that reaches Astro's endpoint, and for every href that is not a site media file", () => {
		const refused = checks
			.filter((each) => each.expect.kind === "imageRefused")
			.map((each) => each.path);
		assert.deepEqual(refused, [
			"/_image",
			"/_image/",
			"/_%69mage",
			"/%5Fimage",
			"/_IMAGE",
			"//_image",
			"/x/../_image",
			`/_image${imageQuery("/_emdash/api/media/file/stack-check.png")}`,
			`/_image${imageQuery(`http://${SITE_NAME}/_emdash/api/media/file/stack-check.png`)}`,
			`/_image${imageQuery("https://stack-check.invalid/_emdash/api/media/file/stack-check.png")}`,
			`/_image${imageQuery(`https://${SITE_NAME}.stack-check.invalid/_emdash/api/media/file/stack-check.png`)}`,
			`/_image${imageQuery(`${MEDIA}a/b.png`)}`,
			`/_image${imageQuery(`${MEDIA}..`)}`,
			`/_image${imageQuery(`${MEDIA}stack-check.png#x`)}`,
			`/_image${imageQuery(`${MEDIA}stack-check.png?other=1`)}`,
			`/_image${imageQuery(`https://${SITE_NAME}/_emdash/api/settings`)}`,
		]);
		for (const each of checks.filter((check) => check.expect.kind === "imageRefused")) {
			assert.equal(each.from, "inside", each.id);
		}
	});

	it("redirects the Admin's thumbnail of a site media file to that file, the content hash and an encoded path included", () => {
		const hashed = `${MEDIA}stack-check.png?_emdash_media=sha1%3A0123abcd`;
		assert.deepEqual(
			["R1", "R2", "R3"].map((id) => [byId(checks, id).path, byId(checks, id).expect]),
			[
				[
					`/_image${imageQuery(`${MEDIA}stack-check.png`)}`,
					{ kind: "redirect", location: `${MEDIA}stack-check.png` },
				],
				[`/_image${imageQuery(hashed)}`, { kind: "redirect", location: hashed }],
				[
					`/_%69mage${imageQuery(`${MEDIA}stack-check.png`)}`,
					{ kind: "redirect", location: `${MEDIA}stack-check.png` },
				],
			],
		);
	});

	it("refuses an upload over the limit from its declared length, and passes the same upload at the Admin's own size", () => {
		const over = byId(checks, "B1");
		assert.deepEqual(
			[over.method, over.path, over.contentLength, over.expect],
			["POST", "/_emdash/api/media", BODY_LIMIT_BYTES + 1, { kind: "bodyRefused" }],
		);
		const within = byId(checks, "B2");
		assert.equal(within.contentLength, ADMIN_UPLOAD_BYTES + 1024);
		assert.deepEqual(
			{
				...within,
				id: over.id,
				what: over.what,
				contentLength: over.contentLength,
				expect: over.expect,
			},
			over,
		);
		assert.deepEqual(within.expect, { kind: "passedToApp" });
	});

	it("keeps the limit just above the Admin's 50 MiB upload, EmDash 1.1.0's default", () => {
		assert.equal(ADMIN_UPLOAD_BYTES, 50 * 1024 * 1024);
		assert.equal(BODY_LIMIT_BYTES, 51 * 1024 * 1024);
	});

	it("still finds both development bypasses refused through the proxy", () => {
		for (const [id, path] of [
			["D1", "/_emdash/api/auth/dev-bypass"],
			["D2", "/_emdash/api/setup/dev-bypass"],
		]) {
			assert.deepEqual(
				[byId(checks, id).path, byId(checks, id).expect],
				[path, { kind: "status", status: 403 }],
			);
		}
	});

	it("gives every check its own id", () => {
		assert.equal(new Set(checks.map((each) => each.id)).size, checks.length);
	});
});

describe("the site file the check reads", () => {
	const site = readFileSync(
		new URL("../../deploy/caddy/songhealth.caddy", import.meta.url),
		"utf8",
	);

	it("refuses /_image with the words the check looks for, and the body with its code at the planned limit", () => {
		assert.match(site, new RegExp(`respond @image "${IMAGE_REFUSAL_MARK}[^"]*" 403`));
		assert.match(site, /max_size 51MiB\n/);
		assert.equal(BODY_LIMIT_BYTES, 51 * 1024 * 1024);
		assert.match(site, /handle_errors 413 \{[^}]*"code":"REQUEST_BODY_TOO_LARGE"/);
	});

	it("redirects only a site media file's href, the way the plan's R and I cases expect", () => {
		const pattern = /\.matches\("(.+)"\)`/.exec(site)?.[1];
		assert.ok(pattern, "no href pattern in the site file");
		const href = new RegExp(pattern);
		for (const check of plan(OPTIONS).filter(
			(each) => each.from === "inside" && each.path.includes("?href="),
		)) {
			const asked = new URLSearchParams(check.path.split("?")[1]).get("href")!;
			assert.equal(href.test(asked), check.expect.kind === "redirect", `${check.id} ${asked}`);
		}
	});
});

describe("each answer's verdict", () => {
	const at = (expect: Check["expect"]): Check => ({ ...plan(OPTIONS)[0]!, expect });
	const pass = (expect: Check["expect"], answer: Answer) => judge(at(expect), answer).pass;

	it("a status: the status, its mark, and the site's certificate", () => {
		const expect = { kind: "status", status: 200, mark: "<meta x" } as const;
		assert.equal(pass(expect, { status: 200, body: "a <meta x b", secured: true }), true);
		assert.equal(pass(expect, { status: 500, body: "a <meta x b", secured: true }), false);
		assert.equal(pass(expect, { status: 200, body: "no mark", secured: true }), false);
		assert.equal(pass(expect, { status: 200, body: "a <meta x b", secured: false }), false);
		assert.equal(
			pass({ kind: "status", status: 403 }, { status: 403, body: "", secured: true }),
			true,
		);
	});

	it("closed: the proxy's own abort, before or after a handshake, never a probe that did not get there", () => {
		assert.equal(pass({ kind: "closed" }, { error: "ECONNRESET", secured: true }), true);
		assert.equal(pass({ kind: "closed" }, { error: "EPROTO", secured: false }), true);
		assert.equal(pass({ kind: "closed" }, { status: 200, body: "", secured: true }), false);
		for (const error of [
			"ECONNREFUSED",
			"TIMEOUT",
			"EHOSTUNREACH",
			"DEPTH_ZERO_SELF_SIGNED_CERT",
		]) {
			assert.equal(pass({ kind: "closed" }, { error, secured: false }), false, error);
		}
	});

	it("closed after the TLS handshake: the site's own refusal, never a forward that is down or a TLS failure", () => {
		assert.equal(pass({ kind: "closedAfterTls" }, { error: "ECONNRESET", secured: true }), true);
		assert.equal(pass({ kind: "closedAfterTls" }, { error: "ECONNRESET", secured: false }), false);
		assert.equal(
			pass({ kind: "closedAfterTls" }, { error: "ECONNREFUSED", secured: false }),
			false,
		);
		assert.equal(pass({ kind: "closedAfterTls" }, { error: "TIMEOUT", secured: true }), false);
		assert.equal(pass({ kind: "closedAfterTls" }, { status: 403, body: "", secured: true }), false);
	});

	it("the picture refusal: 403 with the proxy's own words, never the application's 403", () => {
		assert.equal(
			pass({ kind: "imageRefused" }, { status: 403, body: IMAGE_REFUSAL_MARK, secured: true }),
			true,
		);
		assert.equal(
			pass(
				{ kind: "imageRefused" },
				{ status: 403, body: '{"error":{"code":"FORBIDDEN"}}', secured: true },
			),
			false,
		);
		assert.equal(
			pass({ kind: "imageRefused" }, { status: 404, body: IMAGE_REFUSAL_MARK, secured: true }),
			false,
		);
	});

	it("the redirect: 302 to exactly the file asked for", () => {
		const expect = { kind: "redirect", location: `${MEDIA}a.png` } as const;
		assert.equal(pass(expect, { status: 302, location: `${MEDIA}a.png`, secured: true }), true);
		assert.equal(pass(expect, { status: 301, location: `${MEDIA}a.png`, secured: true }), false);
		assert.equal(pass(expect, { status: 302, location: `${MEDIA}b.png`, secured: true }), false);
		assert.equal(pass(expect, { status: 302, secured: true }), false);
	});

	it("the body refusal: 413 with EmDash's error shape and the limit's code", () => {
		const body = '{"success":false,"error":{"code":"REQUEST_BODY_TOO_LARGE","message":"x"}}';
		assert.equal(pass({ kind: "bodyRefused" }, { status: 413, body, secured: true }), true);
		const application = '{"success":false,"error":{"code":"PAYLOAD_TOO_LARGE","message":"x"}}';
		assert.equal(
			pass({ kind: "bodyRefused" }, { status: 413, body: application, secured: true }),
			false,
		);
		assert.equal(pass({ kind: "bodyRefused" }, { status: 413, body: "", secured: true }), false);
		assert.equal(pass({ kind: "bodyRefused" }, { status: 400, body, secured: true }), false);
	});

	it("passed to the application: EmDash's own JSON answer, never the proxy's refusal", () => {
		const app = '{"success":false,"error":{"code":"NOT_AUTHENTICATED","message":"x"}}';
		assert.equal(pass({ kind: "passedToApp" }, { status: 401, body: app, secured: true }), true);
		assert.equal(
			pass(
				{ kind: "passedToApp" },
				{
					status: 413,
					body: '{"success":false,"error":{"code":"REQUEST_BODY_TOO_LARGE"}}',
					secured: true,
				},
			),
			false,
		);
		assert.equal(pass({ kind: "passedToApp" }, { status: 502, body: "", secured: true }), false);
		assert.equal(pass({ kind: "passedToApp" }, { error: "ECONNRESET", secured: true }), false);
	});

	it("answered: any HTTP answer", () => {
		assert.equal(pass({ kind: "answered" }, { status: 404, body: "", secured: true }), true);
		assert.equal(pass({ kind: "answered" }, { error: "ECONNRESET", secured: true }), false);
	});

	it("gives its evidence without an address", () => {
		const verdict = judge(at({ kind: "closedAfterTls" }), { error: "ECONNRESET", secured: true });
		assert.equal(verdict.evidence, "no answer (ECONNRESET, after the TLS handshake)");
		assert.doesNotMatch(
			judge(at({ kind: "answered" }), { status: 200, body: "", secured: true }).evidence,
			/100\.64|127\.0/,
		);
	});
});

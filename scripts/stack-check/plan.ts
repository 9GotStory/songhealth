// The deployed-stack check's requests and verdicts (#458; spec #450 "Testing Decisions"), which
// scripts/stack-check.ts sends through the proxy at the site's real name. Nothing here opens a
// connection, so node:test covers it (tests/node/stack-check.test.ts).
//
// What it reads, each against deploy/caddy/songhealth.caddy and the host's side
// (docs/operations/production-host-contract.md §1):
// - #218's first finding: another host name never reaches the application (H1, H2), the site's
//   name in another case still does (H3), and another system's site keeps answering (O1);
// - #218's second finding: `/_image` is refused in every spelling Astro routes to its endpoint
//   (I*), except a request for one of the site's own media files, which is redirected to that
//   file so no rendition is made (R*; Product Owner, #458 comment 7209607314);
// - the request body's limit (B1, B2);
// - that the homepage and the Admin's sign-in page answer (S1, S2), and the private-network
//   restriction from both sides (S1 from inside, P1 the same request from outside), with the
//   redirect and the body limit closed from outside too (P2, P3);
// - that both development bypasses still answer 403 (D1, D2; #456).

/** The name the site answers, and the only one the proxy passes to the application. */
export const SITE_NAME = "songhealth.moph.go.th";

/** The largest upload EmDash takes with no `maxUploadSize` set, which `astro.config.mjs` does not
 * set (emdash 1.1.0 src/api/schemas/media.ts `DEFAULT_MAX_UPLOAD_SIZE`). */
export const ADMIN_UPLOAD_BYTES = 50 * 1024 * 1024;

/** The proxy's request-body limit (`request_body` in deploy/caddy/songhealth.caddy): the Admin's
 * own upload with 1 MiB to spare for a multipart form's framing, so the application's own refusal
 * stays the answer staff see for any file it will not take. */
export const BODY_LIMIT_BYTES = 51 * 1024 * 1024;

/** The words of the proxy's `/_image` refusal (deploy/caddy/songhealth.caddy). */
export const IMAGE_REFUSAL_MARK = "Songhealth: /_image is refused at the proxy";

/** The code of the proxy's body-limit refusal, in EmDash's own error shape so that the Admin shows
 * its message. EmDash's own body limits answer `PAYLOAD_TOO_LARGE`
 * (emdash 1.1.0 src/api/parse.ts). */
const BODY_REFUSAL_CODE = "REQUEST_BODY_TOO_LARGE";

const HOME_MARK = '<meta name="songhealth-foundation" content="public-runtime"';
const OTHER_NAME = "stack-check.invalid";
const MEDIA = `https://${SITE_NAME}/_emdash/api/media/file/`;
/** A media file the checks name; no such file need exist, since every answer they read is the
 * proxy's. */
const STACK_CHECK_FILE = `${MEDIA}stack-check.png`;

export interface Target {
	address: string;
	port: number;
}

export interface Options {
	inside: Target;
	outside: Target;
	/** The certificate of the authority that issued the site's, when it is not publicly trusted
	 * (the rehearsal's Internal Test CA). */
	ca?: string;
	/** Another system's site on the same proxy, which must keep answering. */
	otherSite?: string;
}

type Expect =
	| { kind: "status"; status: number; mark?: string }
	/** The proxy's abort, with no HTTP answer: the TLS handshake refused with an alert (EPROTO), or
	 * the connection reset after a handshake. A reset with no handshake (a forward that is down), a
	 * refused or timed-out connection never got there, and proves nothing. */
	| { kind: "closed" }
	/** The site's own refusal of a source: the connection closed after a handshake with the site's
	 * certificate. A forward that is down or a TLS failure is no such proof. */
	| { kind: "closedAfterTls" }
	| { kind: "imageRefused" }
	| { kind: "redirect"; location: string }
	| { kind: "bodyRefused" }
	/** Answered by the application, in EmDash's error shape, not refused by the proxy. */
	| { kind: "passedToApp" }
	| { kind: "answered" };

export interface Check {
	id: string;
	what: string;
	from: "inside" | "outside";
	method: "GET" | "POST";
	path: string;
	/** The TLS server name, and the `Host` header. */
	sni: string;
	host: string;
	/** Whether the certificate must chain to a trusted authority (the site's checks); another
	 * system's site and an unknown name are asked whatever certificate they show. */
	verifyCertificate: boolean;
	/** A POST's declared length. Its bytes are never sent: the proxy refuses a length over its limit
	 * at once, and the application refuses an anonymous upload before it reads the body. */
	contentLength?: number;
	expect: Expect;
}

/** What came back: an HTTP answer, or the error that ended the request. */
export interface Answer {
	status?: number;
	location?: string;
	body?: string;
	error?: string;
	/** Whether a TLS handshake completed before the answer or the error. */
	secured?: boolean;
}

const USAGE = `usage: node scripts/stack-check.ts --inside <address[:port]> --outside <address[:port]> [--ca <file>] [--other-site <name>]
  --inside      the host as a device on the private network reaches it
  --outside     the host as a source outside the private network reaches it
  --ca          the certificate of the authority that issued the site's, when not public
  --other-site  another system's site on the same proxy, which must keep answering
An IPv6 address with a port is written in brackets: [2001:db8::9]:443.`;

function parseTarget(text: string): Target | null {
	const bracketed = /^\[([^\]]+)\](?::(.*))?$/.exec(text);
	let address = text;
	let port: string | undefined;
	if (bracketed) {
		address = bracketed[1]!;
		port = bracketed[2];
	} else if (text.split(":").length === 2) {
		[address, port] = text.split(":") as [string, string];
	}
	if (address === "") return null;
	if (port === undefined) return { address, port: 443 };
	const number = /^\d+$/.test(port) ? Number(port) : NaN;
	return number >= 1 && number <= 65535 ? { address, port: number } : null;
}

export function parseOptions(argv: readonly string[]): Options | { error: string } {
	const values = new Map<string, string>();
	for (let i = 0; i < argv.length; i += 2) {
		const [name, value] = [argv[i]!, argv[i + 1]];
		if (!["--inside", "--outside", "--ca", "--other-site"].includes(name) || value === undefined) {
			return { error: USAGE };
		}
		values.set(name, value);
	}
	const inside = parseTarget(values.get("--inside") ?? "");
	const outside = parseTarget(values.get("--outside") ?? "");
	const otherSite = values.get("--other-site");
	if (!inside || !outside || otherSite?.toLowerCase() === SITE_NAME) return { error: USAGE };
	const ca = values.get("--ca");
	return {
		inside,
		outside,
		...(ca === undefined ? {} : { ca }),
		...(otherSite === undefined ? {} : { otherSite }),
	};
}

/** The `/_image` query the Admin builds for a thumbnail of `href`: the list rows' and the tray's
 * 80 px (EmDash 1.1.0 `@emdash-cms/admin/dist/index.js` `getMediaThumbnailUrl`). */
function imageQuery(href: string): string {
	return `?${new URLSearchParams({ href, w: "80", f: "webp" }).toString()}`;
}

export function plan(options: Options): Check[] {
	const site = { sni: SITE_NAME, host: SITE_NAME, verifyCertificate: true } as const;
	const get = (
		id: string,
		what: string,
		path: string,
		expect: Expect,
		from: Check["from"] = "inside",
	): Check => ({ id, what, from, method: "GET", path, ...site, expect });
	const home: Expect = { kind: "status", status: 200, mark: HOME_MARK };
	const thumbnail = `/_image${imageQuery(STACK_CHECK_FILE)}`;
	const overLimit = {
		method: "POST",
		path: "/_emdash/api/media",
		contentLength: BODY_LIMIT_BYTES + 1,
	} as const;

	const refusedImages: [string, string][] = [
		["/_image", "with no query"],
		["/_image/", "with a trailing slash"],
		["/_%69mage", "with a letter percent-encoded"],
		["/%5Fimage", "with the underscore percent-encoded"],
		["/_IMAGE", "in capitals"],
		["//_image", "after a doubled slash"],
		["/x/../_image", "after a dot segment"],
		[`/_image${imageQuery("/_emdash/api/media/file/stack-check.png")}`, "for a relative href"],
		[
			`/_image${imageQuery(`http://${SITE_NAME}/_emdash/api/media/file/stack-check.png`)}`,
			"for the site's file over plain HTTP",
		],
		[
			`/_image${imageQuery(`https://${OTHER_NAME}/_emdash/api/media/file/stack-check.png`)}`,
			"for another host's media path",
		],
		[
			`/_image${imageQuery(`https://${SITE_NAME}.${OTHER_NAME}/_emdash/api/media/file/stack-check.png`)}`,
			"for a host that begins with the site's name",
		],
		[`/_image${imageQuery(`${MEDIA}a/b.png`)}`, "for a key with a slash"],
		[`/_image${imageQuery(`${MEDIA}..`)}`, "for a dot-segment key"],
		[`/_image${imageQuery(`${STACK_CHECK_FILE}#x`)}`, "for a file with a fragment"],
		[`/_image${imageQuery(`${STACK_CHECK_FILE}?other=1`)}`, "for a file with another query"],
		[
			`/_image${imageQuery(`https://${SITE_NAME}/_emdash/api/settings`)}`,
			"for another of the site's addresses",
		],
	];
	const hashed = `${STACK_CHECK_FILE}?_emdash_media=sha1%3A0123abcd`;

	return [
		get("S1", "the homepage from inside the private network", "/", home),
		get("S2", "the Admin's sign-in page", "/_emdash/admin/login", { kind: "status", status: 200 }),
		get(
			"P1",
			"the homepage from outside the private network",
			"/",
			{ kind: "closedAfterTls" },
			"outside",
		),
		get(
			"P2",
			"a picture's redirect from outside",
			thumbnail,
			{ kind: "closedAfterTls" },
			"outside",
		),
		{
			id: "P3",
			what: "a body over the limit from outside",
			from: "outside",
			...overLimit,
			...site,
			expect: { kind: "closedAfterTls" },
		},
		{
			...get("H1", "another host name under the site's certificate", "/", {
				kind: "closedAfterTls",
			}),
			host: OTHER_NAME,
		},
		{
			...get("H2", "another host name under its own name", "/", { kind: "closed" }),
			sni: OTHER_NAME,
			host: OTHER_NAME,
			verifyCertificate: false,
		},
		{
			...get("H3", "the site's name in capitals", "/", home),
			host: SITE_NAME.toUpperCase(),
		},
		...(options.otherSite === undefined
			? []
			: [
					{
						...get("O1", "another system's site under its own name", "/", { kind: "answered" }),
						sni: options.otherSite,
						host: options.otherSite,
						verifyCertificate: false,
					},
				]),
		...refusedImages.map(([path, what], index) =>
			get(`I${index + 1}`, `/_image ${what}`, path, { kind: "imageRefused" }),
		),
		get("R1", "a thumbnail of a site media file", thumbnail, {
			kind: "redirect",
			location: STACK_CHECK_FILE,
		}),
		get("R2", "a thumbnail with its content hash", `/_image${imageQuery(hashed)}`, {
			kind: "redirect",
			location: hashed,
		}),
		get("R3", "a thumbnail asked at an encoded path", `/_%69mage${imageQuery(STACK_CHECK_FILE)}`, {
			kind: "redirect",
			location: STACK_CHECK_FILE,
		}),
		{
			id: "B1",
			what: "a body over the limit",
			from: "inside",
			...overLimit,
			...site,
			expect: { kind: "bodyRefused" },
		},
		{
			id: "B2",
			what: "a body of the Admin's largest upload",
			from: "inside",
			...overLimit,
			contentLength: ADMIN_UPLOAD_BYTES + 1024,
			...site,
			expect: { kind: "passedToApp" },
		},
		get("D1", "the development sign-in bypass", "/_emdash/api/auth/dev-bypass", {
			kind: "status",
			status: 403,
		}),
		get("D2", "the development setup bypass", "/_emdash/api/setup/dev-bypass", {
			kind: "status",
			status: 403,
		}),
	];
}

function errorCode(body: string | undefined): string | undefined {
	return /"success":false,"error":\{"code":"([A-Z_]+)"/.exec(body ?? "")?.[1];
}

function shown(answer: Answer): string {
	if (answer.status === undefined) {
		return `no answer (${answer.error ?? "unknown"}, ${answer.secured ? "after the TLS handshake" : "no TLS handshake"})`;
	}
	const code = errorCode(answer.body);
	const location = answer.location === undefined ? "" : ` to ${answer.location}`;
	return `HTTP ${answer.status}${code ? ` ${code}` : ""}${location}`;
}

export function judge(check: Check, answer: Answer): { pass: boolean; evidence: string } {
	const expect = check.expect;
	const answered = answer.status !== undefined;
	let pass: boolean;
	switch (expect.kind) {
		case "status":
			pass =
				answer.status === expect.status &&
				answer.secured === true &&
				(expect.mark === undefined || (answer.body ?? "").includes(expect.mark));
			break;
		case "closed":
			pass =
				!answered &&
				(answer.error === "EPROTO" || (answer.error === "ECONNRESET" && answer.secured === true));
			break;
		case "closedAfterTls":
			pass = !answered && answer.secured === true && answer.error === "ECONNRESET";
			break;
		case "imageRefused":
			pass = answer.status === 403 && (answer.body ?? "").includes(IMAGE_REFUSAL_MARK);
			break;
		case "redirect":
			pass = answer.status === 302 && answer.location === expect.location;
			break;
		case "bodyRefused":
			pass = answer.status === 413 && errorCode(answer.body) === BODY_REFUSAL_CODE;
			break;
		case "passedToApp": {
			const code = errorCode(answer.body);
			pass = answered && code !== undefined && code !== BODY_REFUSAL_CODE;
			break;
		}
		case "answered":
			pass = answered;
			break;
	}
	return { pass, evidence: shown(answer) };
}

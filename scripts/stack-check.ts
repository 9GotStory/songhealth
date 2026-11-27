// The deployed-stack check through the proxy (#458; spec #450 "Testing Decisions"): plain requests
// at the site's real name, sent from the workstation to the host under test, the rehearsal machine
// and later the Production host, without change. It reads #218's two findings, the request body's
// limit, that the site and the Admin's sign-in answer, and the private-network restriction from
// both sides. The requests and their verdicts are planned in scripts/stack-check/plan.ts.
//
//   node scripts/stack-check.ts --inside <address[:port]> --outside <address[:port]> \
//     [--ca <file>] [--other-site <name>]
//
// --inside is the host as a device on the private network reaches it; --outside the host as a
// source outside it reaches it (on the rehearsal machine, the workstation's loopback forward,
// scripts/rehearsal/vm.sh). --ca names the certificate of the authority that issued the site's when
// it is not publicly trusted (the rehearsal's Internal Test CA). No address is printed: each check
// prints one PASS or FAIL line, and the command exits 1 when any fails. It writes nothing on the
// host, and no request body is ever sent.

import { readFileSync } from "node:fs";
import { request } from "node:https";

import {
	type Answer,
	type Check,
	judge,
	parseOptions,
	plan,
	type Target,
} from "./stack-check/plan.ts";

const options = parseOptions(process.argv.slice(2));
if ("error" in options) {
	console.error(options.error);
	process.exit(2);
}
const ca = options.ca === undefined ? undefined : readFileSync(options.ca, "utf8");

/** Keep the first 64 KiB of an answer: enough for a page's head and an error's JSON. */
const BODY_KEPT = 64 * 1024;

function send(check: Check, at: Target): Promise<Answer> {
	return new Promise((resolve) => {
		let secured = false;
		let settled = false;
		const done = (answer: Answer) => {
			if (settled) return;
			settled = true;
			resolve({ ...answer, secured });
			req.destroy();
		};
		const req = request({
			host: at.address,
			port: at.port,
			servername: check.sni,
			method: check.method,
			path: check.path,
			agent: false,
			timeout: 15_000,
			rejectUnauthorized: check.verifyCertificate,
			...(ca === undefined ? {} : { ca }),
			headers: {
				host: check.host,
				...(check.contentLength === undefined
					? {}
					: {
							"content-length": String(check.contentLength),
							"content-type": "application/octet-stream",
						}),
			},
		});
		req.on("socket", (socket) => socket.once("secureConnect", () => (secured = true)));
		req.on("response", (res) => {
			let body = "";
			res.setEncoding("utf8");
			res.on("data", (chunk: string) => {
				if (body.length < BODY_KEPT) body += chunk;
			});
			const answer = () => ({
				status: res.statusCode,
				body,
				...(res.headers.location === undefined ? {} : { location: res.headers.location }),
			});
			res.on("end", () => done(answer()));
			// An answer that comes while its declared body is still owed ends when the connection does.
			res.on("error", () => done(answer()));
			res.on("close", () => done(answer()));
		});
		req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "TIMEOUT" })));
		req.on("error", (error: NodeJS.ErrnoException) => done({ error: error.code ?? error.name }));
		// A declared body is never sent: the headers go out, and the answer is read without it.
		if (check.contentLength === undefined) req.end();
		else req.flushHeaders();
	});
}

let failed = 0;
for (const check of plan(options)) {
	const answer = await send(check, check.from === "inside" ? options.inside : options.outside);
	const verdict = judge(check, answer);
	if (!verdict.pass) failed++;
	console.log(`${verdict.pass ? "PASS" : "FAIL"} ${check.id} ${check.what}: ${verdict.evidence}`);
}
console.log(failed === 0 ? "stack-check: all passed" : `stack-check: ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;

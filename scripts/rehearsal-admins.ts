// The Administrators' evidence scripts on the rehearsal machine (#457; spec #450 "Testing
// Decisions": Playwright evidence scripts with a virtual authenticator, kept in the repository, run
// on the rehearsal machine only, never a CI gate), against EmDash 1.1.0. Run on the workstation:
//
//   node scripts/rehearsal-admins.ts preflight <address> <ca> <out>
//   node scripts/rehearsal-admins.ts admins    <address> <ca> <out> [<invitation file>]
//   node scripts/rehearsal-admins.ts recovery  <address> <ca> <out> <recovery link file>
//
// <address> is the rehearsal machine's on the private network; <ca> its Internal Test CA's
// certificate (public: /usr/local/share/songhealth-test-ca.crt there); <out> the evidence folder.
// Every step first refuses any machine whose certificate that authority did not issue for the
// site's name (scripts/rehearsal-admins/plan.ts `targetRefusal`), so that a virtual authenticator
// never meets the Production host. No address, link or key is printed or written to the evidence
// folder: each check prints one PASS or FAIL line, which the folder's results.txt keeps.
//
// - preflight: both development bypasses answer 403; the setup routes answer from inside the
//   allowed network and give no answer from outside it (the workstation's loopback forward to the
//   machine, scripts/rehearsal/vm.sh); once an Administrator exists, setup refuses another.

import { readFileSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { join } from "node:path";
import { connect } from "node:tls";

import { parseCommand, type Peer, SITE_NAME, targetRefusal } from "./rehearsal-admins/plan.ts";

/** A source outside the allowed network: the workstation's loopback forward to the machine's 443
 * (scripts/rehearsal/vm.sh HTTPS_PORT), which reaches the proxy from QEMU's user network. */
const OUTSIDE = { address: "127.0.0.1", port: 8443 };

const results: string[] = [];

function record(pass: boolean, id: string, what: string, evidence: string): void {
	const line = `${pass ? "PASS" : "FAIL"} ${id} ${what}: ${evidence}`;
	results.push(line);
	process.stdout.write(`${line}\n`);
}

function peer(address: string, ca: string): Promise<Peer> {
	return new Promise((done, fail) => {
		const socket = connect(
			{ host: address, port: 443, servername: SITE_NAME, ca, rejectUnauthorized: false },
			() => {
				const cert = socket.getPeerCertificate();
				const names = (cert.subjectaltname ?? "")
					.split(", ")
					.flatMap((entry) => (entry.startsWith("DNS:") ? [entry.slice(4)] : []));
				const issuer = cert.issuer?.CN;
				done({
					authorized: socket.authorized,
					error: socket.authorizationError?.message,
					issuer: Array.isArray(issuer) ? issuer.join(", ") : (issuer ?? ""),
					names,
				});
				socket.end();
			},
		);
		socket.setTimeout(10_000, () => socket.destroy(new Error("no TLS answer in 10 s")));
		socket.on("error", fail);
	});
}

interface Answer {
	status?: number;
	body?: string;
	error?: string;
}

/** One request at the site's name, sent to the given address; an error is the failure's code. */
function ask(
	at: { address: string; port: number },
	ca: string,
	method: string,
	path: string,
	body?: string,
): Promise<Answer> {
	return new Promise((done) => {
		const req = request(
			{
				host: at.address,
				port: at.port,
				servername: SITE_NAME,
				ca,
				method,
				path,
				timeout: 10_000,
				headers: {
					host: SITE_NAME,
					origin: `https://${SITE_NAME}`,
					...(body === undefined ? {} : { "content-type": "application/json" }),
				},
			},
			(res) => {
				let text = "";
				res.setEncoding("utf8");
				res.on("data", (chunk: string) => (text += chunk));
				res.on("end", () => done({ status: res.statusCode, body: text }));
			},
		);
		req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "TIMEOUT" })));
		req.on("error", (error: NodeJS.ErrnoException) => done({ error: error.code ?? error.message }));
		req.end(body);
	});
}

function shown(answer: Answer): string {
	if (answer.error) return `no answer (${answer.error})`;
	const code = /"code":"([A-Z_]+)"/.exec(answer.body ?? "")?.[1];
	return `HTTP ${answer.status}${code ? ` ${code}` : ""}`;
}

async function preflight(address: string, ca: string): Promise<void> {
	const inside = { address, port: 443 };
	for (const path of ["/_emdash/api/auth/dev-bypass", "/_emdash/api/setup/dev-bypass"]) {
		const answer = await ask(inside, ca, "GET", path);
		record(answer.status === 403, "P1", `${path} from inside`, shown(answer));
	}

	const status = await ask(inside, ca, "GET", "/_emdash/api/setup/status");
	const needsSetup = /"needsSetup":true/.test(status.body ?? "");
	record(
		status.status === 200,
		"P2",
		"setup status from inside",
		`${shown(status)}, needsSetup ${needsSetup}`,
	);

	const routes: [string, string, string?][] = [
		["GET", "/_emdash/api/setup/status"],
		["GET", "/_emdash/admin/setup"],
		["POST", "/_emdash/api/setup/admin", "{}"],
	];
	for (const [method, path, body] of routes) {
		const outside = await ask(OUTSIDE, ca, method, path, body);
		record(
			outside.error !== undefined,
			"P3",
			`${method} ${path} from outside the allowed network`,
			shown(outside),
		);
	}

	const setupPage = await ask(inside, ca, "GET", "/_emdash/admin/setup");
	record(setupPage.status === 200, "P4", "GET /_emdash/admin/setup from inside", shown(setupPage));
	// An empty body is refused before setup writes anything
	// (emdash/src/astro/routes/api/setup/admin.ts: the user count, then the body's check, then the
	// setup state); once an Administrator exists the count alone refuses.
	const admin = await ask(inside, ca, "POST", "/_emdash/api/setup/admin", "{}");
	const code = /"code":"([A-Z_]+)"/.exec(admin.body ?? "")?.[1];
	const expected = needsSetup ? "VALIDATION_ERROR" : ["SETUP_COMPLETE", "ADMIN_EXISTS"];
	record(
		admin.status === 400 &&
			(Array.isArray(expected) ? expected.includes(code ?? "") : code === expected),
		"P5",
		needsSetup
			? "POST /_emdash/api/setup/admin from inside, empty body (the route answers; nothing is written)"
			: "POST /_emdash/api/setup/admin from inside once an Administrator exists (refused)",
		shown(admin),
	);
}

async function main(): Promise<void> {
	const command = parseCommand(process.argv.slice(2));
	if ("error" in command) throw new Error(command.error);
	const ca = readFileSync(command.ca, "utf8");
	const refusal = targetRefusal(await peer(command.address, ca));
	if (refusal) throw new Error(`refused: ${refusal}`);
	process.stdout.write(
		`rehearsal-admins: the machine is the rehearsal machine (${SITE_NAME}, Internal Test CA)\n`,
	);

	if (command.step === "preflight") await preflight(command.address, ca);
	else throw new Error(`${command.step}: not built yet`);

	const file = join(command.out, `${command.step}-results.txt`);
	writeFileSync(file, `${new Date().toISOString()} ${command.step}\n${results.join("\n")}\n`);
	if (results.some((line) => line.startsWith("FAIL"))) process.exitCode = 1;
}

main().catch((error: unknown) => {
	process.stderr.write(
		`rehearsal-admins: ${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exit(1);
});

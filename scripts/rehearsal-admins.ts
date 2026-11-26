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

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { homedir } from "node:os";
import { join } from "node:path";
import { connect } from "node:tls";

import type { Page } from "@playwright/test";

import {
	type Credential,
	type Device,
	dismissWelcome,
	openBrowser,
	openDevice,
	ORIGIN,
	signIn,
	whoAmI,
} from "./rehearsal-admins/browser.ts";
import {
	type Command,
	parseCommand,
	type Peer,
	SITE_NAME,
	targetRefusal,
} from "./rehearsal-admins/plan.ts";

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
	/** Whether the TLS handshake with the site's certificate completed before the answer or error. */
	secured?: boolean;
}

/** One request at the site's name, sent to the given address; an error is the failure's code. */
function ask(
	at: { address: string; port: number },
	ca: string,
	method: string,
	path: string,
	body?: string,
): Promise<Answer> {
	return new Promise((resolve) => {
		let secured = false;
		const done = (answer: Answer) => resolve({ ...answer, secured });
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
		req.on("socket", (socket) => socket.once("secureConnect", () => (secured = true)));
		req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "TIMEOUT" })));
		req.on("error", (error: NodeJS.ErrnoException) => done({ error: error.code ?? error.message }));
		req.end(body);
	});
}

function shown(answer: Answer): string {
	if (answer.error) {
		return `no answer (${answer.error}${answer.secured ? ", after the TLS handshake" : ", no TLS handshake"})`;
	}
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
		// The site's own refusal (the proxy's `abort`) closes the connection after the TLS handshake
		// with the site's certificate; a forward that is down or a TLS failure is no such proof.
		record(
			outside.secured === true && outside.error === "ECONNRESET",
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

	// The sign-in screen's "Sign in with email link": with no email provider the route refuses
	// before it writes anything (emdash/src/astro/routes/api/auth/magic-link/send.ts).
	const emailLink = await ask(
		inside,
		ca,
		"POST",
		"/_emdash/api/auth/magic-link/send",
		JSON.stringify({ email: "nobody@songhealth.invalid" }),
	);
	record(
		/EMAIL_NOT_CONFIGURED/.test(emailLink.body ?? ""),
		"P6",
		"the sign-in screen's email link from inside (no email provider: refused)",
		shown(emailLink),
	);
}

// ------------------------------------------------------------------ the browser steps

/** The rehearsal's virtual Administrator: their email and the passkeys of each device, private keys
 * included, in the rehearsal's own keys folder (scripts/rehearsal/vm.sh `remove` deletes it). */
const STATE = join(homedir(), ".local/state/songhealth-rehearsal/virtual-admin.json");

interface State {
	email: string;
	name: string;
	devices: Record<string, Credential[]>;
}

function loadState(): State | null {
	return existsSync(STATE) ? (JSON.parse(readFileSync(STATE, "utf8")) as State) : null;
}

function saveState(state: State): void {
	writeFileSync(STATE, `${JSON.stringify(state, null, "\t")}\n`, { mode: 0o600 });
}

function readLink(file: string): string {
	const link = readFileSync(file, "utf8").trim();
	if (new URL(link).origin !== ORIGIN)
		throw new Error(`the link in ${file} is not under ${ORIGIN}`);
	return link;
}

async function shot(page: Page, out: string, name: string): Promise<void> {
	await page.screenshot({ path: join(out, `${name}.png`) });
}

/** The page's visible text with any token hidden, for the evidence. */
async function pageText(page: Page): Promise<string> {
	const text = await page.locator("body").innerText();
	return text
		.replace(/token=\S+/g, "token=<hidden>")
		.replace(/\s+/g, " ")
		.trim();
}

/** The device's passkeys once the page has made one, within 30 seconds. */
async function madePasskeys(device: Device): Promise<Credential[]> {
	for (let waited = 0; waited < 30_000; waited += 500) {
		const passkeys = await device.passkeys();
		if (passkeys.length > 0) return passkeys;
		await device.page.waitForTimeout(500);
	}
	throw new Error("no passkey was made within 30 s");
}

/** Makes an invitation for a new Administrator from the Admin's Users screen and reads it there. */
async function inviteFromAdmin(
	page: Page,
	email: string,
): Promise<{ link: string; terms: string }> {
	await page.goto(`${ORIGIN}/_emdash/admin/users`, { waitUntil: "networkidle" });
	await page.getByRole("button", { name: "Invite User" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("textbox", { name: "Email address" }).fill(email);
	await dialog.getByRole("combobox", { name: "Role" }).click();
	await page.getByRole("option", { name: /^Admin/ }).click();
	await dialog.getByRole("button", { name: "Send Invite" }).click();
	await dialog.getByText("Invite Link Created").waitFor();
	const text = await dialog.innerText();
	const link = /https:\/\/\S+\/invite\/accept\?token=\S+/.exec(text)?.[0];
	if (!link) throw new Error("the invitation dialog shows no link");
	await dialog.getByRole("button", { name: "Done" }).click();
	const terms = /This link expires in [^.]+\./.exec(text)?.[0] ?? "no lifetime shown";
	return { link, terms };
}

/** Adds a passkey on the Admin's Security Settings with the device's present authenticator, and
 * returns what that authenticator then holds. */
async function addPasskey(device: Device, name: string): Promise<Credential[]> {
	const { page } = device;
	await page.goto(`${ORIGIN}/_emdash/admin/settings/security`, { waitUntil: "networkidle" });
	await page.getByRole("button", { name: "Add Passkey" }).click();
	await page.getByRole("textbox", { name: /Passkey name/i }).fill(name);
	await page.getByRole("button", { name: "Register Passkey" }).click();
	return madePasskeys(device);
}

/** The passkeys' names the Security Settings list. */
async function listedPasskeys(page: Page): Promise<string[]> {
	await page.goto(`${ORIGIN}/_emdash/admin/settings/security`, { waitUntil: "networkidle" });
	const response = await page.evaluate(async () => {
		const r = await fetch("/_emdash/api/auth/passkey");
		return (await r.json()) as {
			data: { items?: { name: string | null }[] } | { name: string | null }[];
		};
	});
	const items = Array.isArray(response.data) ? response.data : (response.data.items ?? []);
	return items.map((item) => item.name ?? "(no name)");
}

/** Removes every passkey but the one named `keep`, from the Security Settings, as a person does. */
async function removeOthers(page: Page, keep: string): Promise<number> {
	let removed = 0;
	for (;;) {
		const names = await listedPasskeys(page);
		const other = names.find((name) => name !== keep);
		if (!other) return removed;
		await page.getByRole("button", { name: `Remove ${other}` }).click();
		const confirm = page.getByRole("dialog", { name: "Remove passkey?" });
		await confirm.getByRole("button", { name: "Remove", exact: true }).click();
		await confirm.waitFor({ state: "hidden" });
		removed += 1;
	}
}

/** A passkey request at another name or address: the browser refuses it before any authenticator
 * answers, since a passkey's relying party must be the page's own name (WebAuthn Level 3 §5.1.4.1).
 * */
async function foreignRequest(
	device: Device,
	origin: string,
	rpId: string | null,
	credentialId: string,
): Promise<string> {
	const page = await device.context.newPage();
	await page.route(`${origin}/**`, (route) =>
		route.fulfill({ contentType: "text/html", body: "<!doctype html><title>look-alike</title>" }),
	);
	await page.goto(`${origin}/`);
	const outcome = await page.evaluate(
		async ([rp, id]) => {
			try {
				const raw = atob(id.replace(/-/g, "+").replace(/_/g, "/"));
				await navigator.credentials.get({
					publicKey: {
						challenge: crypto.getRandomValues(new Uint8Array(32)),
						allowCredentials: [
							{ type: "public-key", id: Uint8Array.from(raw, (c) => c.charCodeAt(0)) },
						],
						...(rp ? { rpId: rp } : {}),
						userVerification: "required",
						timeout: 5000,
					},
				});
				return "a passkey answered";
			} catch (error) {
				return `${(error as Error).name}: ${(error as Error).message}`.slice(0, 160);
			}
		},
		[rpId, credentialId] as const,
	);
	await page.close();
	return outcome;
}

async function admins(command: Command): Promise<void> {
	const { browser, close } = await openBrowser(command.address, command.ca);
	try {
		const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).toLowerCase();
		let link: string;
		if (command.link) {
			link = readLink(command.link);
		} else {
			const state = loadState();
			if (!state || Object.keys(state.devices).length === 0) {
				throw new Error(
					`no stored Administrator in ${STATE}: give an invitation copied from the Admin`,
				);
			}
			// Each stored device on its own: a removed passkey is refused, the one left signs in.
			let inviter: Device | undefined;
			for (const passkeys of Object.values(state.devices)) {
				const device = await openDevice(browser, passkeys);
				if ((await signIn(device.page)) === "signed in") {
					inviter = device;
					break;
				}
				await device.context.close();
			}
			if (!inviter) throw new Error(`no device of ${STATE} signs in`);
			const invitation = await inviteFromAdmin(
				inviter.page,
				`rehearsal-${stamp}@songhealth.invalid`,
			);
			link = invitation.link;
			record(
				/7 days/.test(invitation.terms) && /once/.test(invitation.terms),
				"A0",
				"the Admin's invitation dialog states the link's lifetime and single use",
				invitation.terms,
			);
			await inviter.context.close();
		}

		// A1: the invitation, accepted on device A.
		const name = `Rehearsal Administrator ${stamp}`;
		const a = await openDevice(browser);
		await a.page.goto(link, { waitUntil: "networkidle" });
		const email = await a.page.getByRole("textbox", { name: "Email", exact: true }).inputValue();
		await a.page.getByRole("textbox", { name: "Your name (optional)" }).fill(name);
		await shot(a.page, command.out, "a1-invitation");
		await a.page.getByRole("button", { name: "Create passkey" }).click();
		// The page shows a success step and waits for a press; the session is already set by
		// `…/auth/invite/complete`. Keep the passkey the moment it exists.
		const state: State = { email, name, devices: { A: await madePasskeys(a) } };
		saveState(state);
		await a.page
			.getByText(/Passkey (created|registered successfully)/)
			.first()
			.waitFor();
		await shot(a.page, command.out, "a1-passkey-created");
		await a.page.goto(`${ORIGIN}/_emdash/admin`, { waitUntil: "networkidle" });
		await dismissWelcome(a.page);
		const joined = await whoAmI(a.page);
		record(
			typeof joined !== "number" && joined.email === email && joined.role === 50,
			"A1",
			"an invitation copied from the Admin makes an Administrator with a passkey under the site's name",
			typeof joined === "number"
				? `HTTP ${joined}`
				: `role ${joined.role}, passkey for ${state.devices.A![0]?.rpId ?? "?"}`,
		);
		await shot(a.page, command.out, "a1-joined");

		// A2: the same link again, in another browser.
		const again = await openDevice(browser);
		await again.page.goto(link, { waitUntil: "networkidle" });
		await again.page.waitForTimeout(1500);
		const reused = await pageText(again.page);
		record(
			!(await again.page.getByRole("button", { name: "Create passkey" }).isVisible()) &&
				/invalid|expired|used/i.test(reused),
			"A2",
			"the invitation works only once",
			reused.slice(0, 160),
		);
		await shot(again.page, command.out, "a2-invitation-again");
		await again.context.close();

		// A3: a second passkey, from device B, added while A's session is signed in.
		await a.replaceAuthenticator();
		state.devices.B = await addPasskey(a, "Device B");
		saveState(state);
		const listed = await listedPasskeys(a.page);
		record(
			listed.length === 2,
			"A3",
			"one account holds two passkeys",
			`listed: ${listed.join(", ")}`,
		);
		await shot(a.page, command.out, "a3-two-passkeys");
		await a.context.close();

		// A4: either passkey signs in, each on its own device.
		for (const label of ["A", "B"]) {
			const device = await openDevice(browser, state.devices[label]);
			const outcome = await signIn(device.page);
			record(outcome === "signed in", "A4", `device ${label}'s passkey signs in`, outcome);
			await device.context.close();
		}

		// A5: A's passkey removed from B's session; B still signs in, A no longer does.
		const b = await openDevice(browser, state.devices.B);
		await signIn(b.page);
		const removed = await removeOthers(b.page, "Device B");
		const left = await listedPasskeys(b.page);
		record(
			removed === 1 && left.length === 1,
			"A5",
			"a passkey is removed while the other stays",
			`removed ${removed}, left: ${left.join(", ")}`,
		);
		await shot(b.page, command.out, "a5-one-passkey");
		await b.context.close();
		const removedA = state.devices.A ?? [];
		delete state.devices.A;
		saveState(state);
		for (const [label, passkeys, expect] of [
			["A (removed)", removedA, false],
			["B", state.devices.B ?? [], true],
		] as const) {
			const device = await openDevice(browser, passkeys);
			const outcome = await signIn(device.page);
			record(
				(outcome === "signed in") === expect,
				"A6",
				`after the removal, device ${label} ${expect ? "signs in" : "is refused"}`,
				outcome,
			);
			await device.context.close();
		}

		// A7: another name or address: the browser refuses the site's passkey there.
		const foreign = await openDevice(browser, state.devices.B);
		const id = state.devices.B?.[0]?.credentialId ?? "";
		for (const origin of ["https://songhealth-moph.example", "https://192.0.2.10"]) {
			const named = await foreignRequest(foreign, origin, SITE_NAME, id);
			record(
				/SecurityError/.test(named),
				"A7",
				`at ${origin}, the site's passkey asked for under ${SITE_NAME}`,
				named,
			);
			const own = await foreignRequest(foreign, origin, null, id);
			record(
				!/a passkey answered/.test(own),
				"A7",
				`at ${origin}, the site's passkey asked for under the page's own name`,
				own,
			);
		}
		await foreign.context.close();
	} finally {
		await close();
	}
}

/**
 * The day no Administrator can sign in (docs/operations/administrator-recovery.md), followed on the
 * Administrator's side: their device holds no passkey that works, the recovery link
 * scripts/admin-recovery.ts made on the machine signs them in once, they add a passkey and remove
 * the lost ones, and sign in again with the new one. The link file is deleted at the end.
 */
async function recovery(command: Command): Promise<void> {
	const link = readLink(command.link!);
	const { browser, close } = await openBrowser(command.address, command.ca);
	try {
		const device = await openDevice(browser);
		const before = await signIn(device.page);
		record(
			before !== "signed in",
			"R1",
			"the starting point: the Administrator's device holds no passkey that works, so it cannot sign in",
			before,
		);

		await device.page.goto(link, { waitUntil: "networkidle" });
		await shot(device.page, command.out, "r2-recovery-link");
		const landing = await pageText(device.page);
		await device.page.getByRole("button", { name: /Continue/ }).click();
		await device.page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
		await dismissWelcome(device.page);
		const who = await whoAmI(device.page);
		record(
			typeof who !== "number" && who.role === 50,
			"R2",
			"the recovery link signs the locked-out Administrator in, once they press Continue",
			typeof who === "number"
				? `HTTP ${who}`
				: `${who.email}, role ${who.role}; the page said: ${landing.slice(0, 120)}`,
		);
		if (typeof who === "number") return;

		const passkeys = await addPasskey(device, "Recovery device");
		const removed = await removeOthers(device.page, "Recovery device");
		const left = await listedPasskeys(device.page);
		record(
			removed >= 1 && left.length === 1 && passkeys[0]?.rpId === SITE_NAME,
			"R3",
			"they add a passkey under the site's name and remove the lost ones",
			`removed ${removed}, left: ${left.join(", ")}`,
		);
		await shot(device.page, command.out, "r3-new-passkey");
		saveState({ email: who.email, name: "", devices: { R: passkeys } });
		await device.context.close();

		const again = await openDevice(browser, passkeys);
		const after = await signIn(again.page);
		record(after === "signed in", "R4", "they sign in again with the new passkey", after);
		await again.context.close();

		const reuse = await openDevice(browser);
		await reuse.page.goto(link, { waitUntil: "networkidle" });
		await reuse.page.getByRole("button", { name: /Continue/ }).click();
		await reuse.page.waitForTimeout(3000);
		const reused = await whoAmI(reuse.page);
		record(
			reused === 401,
			"R5",
			"the same link a second time signs nobody in",
			`${typeof reused === "number" ? `HTTP ${reused}` : "signed in"}; the page said: ${(await pageText(reuse.page)).slice(0, 120)}`,
		);
		await shot(reuse.page, command.out, "r5-link-again");
		await reuse.context.close();
	} finally {
		await close();
		rmSync(command.link!, { force: true });
	}
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
	else if (command.step === "admins") await admins(command);
	else await recovery(command);

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

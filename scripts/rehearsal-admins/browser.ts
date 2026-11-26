// The browser that scripts/rehearsal-admins.ts drives (#457): Playwright's Chromium on the
// workstation, which reaches the site's name at the rehearsal machine's address and trusts only the
// Internal Test CA, through a throwaway profile, so that neither the workstation's hosts file nor
// its trust store changes (#456 comment 7164993353). Each device is a browser context of its own
// with one virtual authenticator, Chrome's WebAuthn domain (CDP
// `WebAuthn.addVirtualAuthenticator`): a platform authenticator that verifies its user, as Windows
// Hello does. Its passkeys are exported and imported as the domain's credentials, private keys
// included, which the command keeps in an owner-only file of the rehearsal's own keys folder.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	type Browser,
	type BrowserContext,
	type CDPSession,
	chromium,
	type Page,
} from "@playwright/test";

import { SITE_NAME } from "./plan.ts";

export const ORIGIN = `https://${SITE_NAME}`;

/** One passkey as Chrome's WebAuthn domain exports it. */
export interface Credential {
	credentialId: string;
	isResidentCredential: boolean;
	rpId?: string;
	privateKey: string;
	userHandle?: string;
	signCount: number;
}

export interface Device {
	context: BrowserContext;
	page: Page;
	cdp: CDPSession;
	authenticator: string;
	/** The passkeys this device holds now. */
	passkeys(): Promise<Credential[]>;
	/** Takes this device's authenticator away and gives it a new, empty one: another device in the
	 * same signed-in browser, as a person adds a passkey from a second device. */
	replaceAuthenticator(): Promise<void>;
}

/** Chromium with a throwaway profile whose NSS store trusts the test authority alone. */
export async function openBrowser(
	address: string,
	caFile: string,
): Promise<{ browser: Browser; close(): Promise<void> }> {
	const home = mkdtempSync(join(tmpdir(), "rehearsal-admins-"));
	const nss = `sql:${join(home, ".pki/nssdb")}`;
	mkdirSync(join(home, ".pki/nssdb"), { recursive: true });
	for (const args of [
		["-d", nss, "-N", "--empty-password"],
		["-d", nss, "-A", "-t", "C,,", "-n", "rehearsal-test-ca", "-i", caFile],
	]) {
		const result = spawnSync("certutil", args, { encoding: "utf8" });
		if (result.status !== 0) throw new Error(`certutil ${args[2]} failed: ${result.stderr.trim()}`);
	}
	const browser = await chromium.launch({
		args: [`--host-resolver-rules=MAP ${SITE_NAME} ${address}`],
		env: { ...process.env, HOME: home },
	});
	return {
		browser,
		async close() {
			await browser.close();
			rmSync(home, { recursive: true, force: true });
		},
	};
}

async function addAuthenticator(cdp: CDPSession): Promise<string> {
	const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
		options: {
			protocol: "ctap2",
			transport: "internal",
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	});
	return authenticatorId;
}

/** A device with the given passkeys, or none. */
export async function openDevice(browser: Browser, passkeys: Credential[] = []): Promise<Device> {
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("WebAuthn.enable");
	const device: Device = {
		context,
		page,
		cdp,
		authenticator: await addAuthenticator(cdp),
		async passkeys() {
			const { credentials } = await cdp.send("WebAuthn.getCredentials", {
				authenticatorId: device.authenticator,
			});
			return credentials as Credential[];
		},
		async replaceAuthenticator() {
			await cdp.send("WebAuthn.removeVirtualAuthenticator", {
				authenticatorId: device.authenticator,
			});
			device.authenticator = await addAuthenticator(cdp);
		},
	};
	// The site refuses a passkey whose signature counter is not above the one it stored at the last
	// sign-in (a cloned authenticator's sign, WebAuthn Level 3 §6.1.1), and a stored passkey keeps
	// the counter it had when it was saved: it starts again at the present Unix second, which is
	// above any count an earlier run left.
	const now = Math.floor(Date.now() / 1000);
	for (const credential of passkeys) {
		await cdp.send("WebAuthn.addCredential", {
			authenticatorId: device.authenticator,
			credential: { ...credential, signCount: Math.max(credential.signCount, now) },
		});
	}
	return device;
}

/** Who the page's session is: EmDash's own `/auth/me`, or its HTTP status when nobody is. */
export async function whoAmI(page: Page): Promise<{ email: string; role: number } | number> {
	return page.evaluate(async () => {
		const response = await fetch("/_emdash/api/auth/me");
		if (!response.ok) return response.status;
		const body = (await response.json()) as { data: { email: string; role: number } };
		return { email: body.data.email, role: body.data.role };
	});
}

/** Closes the welcome dialog an account's first visit to the Admin opens over it. */
export async function dismissWelcome(page: Page): Promise<void> {
	const welcome = page.getByRole("button", { name: "Get Started" });
	await welcome.waitFor({ timeout: 3000 }).catch(() => undefined);
	if (await welcome.isVisible()) await welcome.click();
}

/** Signs in on the Admin's sign-in screen with the device's passkey; the page then shows the Admin,
 * or stays on the sign-in screen with its message. */
export async function signIn(page: Page): Promise<string> {
	await page.goto(`${ORIGIN}/_emdash/admin/login`, { waitUntil: "networkidle" });
	await page.getByRole("button", { name: "Sign in with Passkey" }).click();
	await Promise.race([
		page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 }),
		page.getByRole("alert").first().waitFor({ timeout: 20_000 }),
	]).catch(() => undefined);
	if (!new URL(page.url()).pathname.endsWith("/login")) {
		await dismissWelcome(page);
		return "signed in";
	}
	const alert = await page
		.getByRole("alert")
		.first()
		.innerText()
		.catch(() => "");
	return alert.trim() || "stayed on the sign-in screen";
}

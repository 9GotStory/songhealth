// Claude Code's driver for the Product Owner's test browsers on their Windows 11 computer (#457
// retro): the SSH tunnel of docs/operations/windows-client-runbook.md §2, a probe of both browsers,
// and one action at a time on a page of the site, through Playwright's `connectOverCDP`. It drives
// pages only: each Windows Hello approval is the Product Owner's, on the rehearsal machine and on
// the Production host alike, and a click that opens Windows Hello waits until the Product Owner has
// brought that browser's window to the front. Its output never holds a tailnet address or name.
//
//   node scripts/windows-drive.ts tunnel     (run in the background; stops when the channel closes)
//   node scripts/windows-drive.ts probe
//   node scripts/windows-drive.ts edge click button "Sign in with Passkey"
//
// `node scripts/windows-drive.ts` alone prints every command.

import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import {
	type Browser,
	type Command,
	LOCAL_PORTS,
	parseCommand,
	redact,
	windowsPeer,
} from "./windows-drive/plan.ts";

const SITE = "https://songhealth.moph.go.th";
const STATE = join(homedir(), ".local/state/songhealth-windows");
const REMOTE_PORTS: Record<Browser, number> = { chrome: 9222, edge: 9223 };

function say(text: string): void {
	process.stdout.write(`${redact(text)}\n`);
}

function computer(): string {
	const status = spawnSync("tailscale", ["status", "--json"], { encoding: "utf8" });
	if (status.status !== 0)
		throw new Error(`tailscale status failed: ${redact(status.stderr.trim())}`);
	const peer = windowsPeer(status.stdout);
	if ("error" in peer) throw new Error(peer.error);
	if (!peer.online) {
		throw new Error(
			"the Windows computer is offline in the tailnet: the Product Owner wakes it and checks Tailscale",
		);
	}
	return peer.address;
}

/**
 * The tunnel, in the foreground until the channel closes; ssh's own messages pass through redact.
 */
function tunnel(): Promise<number> {
	const forwards = Object.entries(LOCAL_PORTS).flatMap(([browser, port]) => [
		"-L",
		`${port}:127.0.0.1:${REMOTE_PORTS[browser as Browser]}`,
	]);
	const ssh = spawn(
		"ssh",
		[
			"-N",
			"-o",
			"ExitOnForwardFailure=yes",
			"-o",
			"ServerAliveInterval=30",
			"-o",
			"ConnectTimeout=15",
			"-i",
			join(STATE, "channel-key"),
			"-o",
			`UserKnownHostsFile=${join(STATE, "known_hosts")}`,
			...forwards,
			`songhealth-test@${computer()}`,
		],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	for (const stream of [ssh.stdout, ssh.stderr])
		stream.on("data", (chunk: Buffer) => say(chunk.toString().trimEnd()));
	say(
		`drive: tunnel open: chrome on 127.0.0.1:${LOCAL_PORTS.chrome}, edge on 127.0.0.1:${LOCAL_PORTS.edge}`,
	);
	return new Promise((done) => ssh.on("close", (code) => done(code ?? 1)));
}

/** Each browser's version, or why it does not answer. */
async function probe(): Promise<boolean> {
	let all = true;
	for (const [browser, port] of Object.entries(LOCAL_PORTS)) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
				signal: AbortSignal.timeout(5000),
			});
			say(`${browser}: ${((await response.json()) as { Browser: string }).Browser}`);
		} catch (error) {
			all = false;
			const code = (error as { cause?: { code?: string } }).cause?.code;
			say(
				code === "ECONNREFUSED"
					? `${browser}: no tunnel: run \`node scripts/windows-drive.ts tunnel\``
					: `${browser}: no answer through the tunnel: the Product Owner opens the test browser (runbook §2, step 2), or the computer is asleep`,
			);
		}
	}
	return all;
}

async function page(command: Extract<Command, { action: "page" }>): Promise<void> {
	const browser = await chromium.connectOverCDP(`http://127.0.0.1:${LOCAL_PORTS[command.browser]}`);
	try {
		const context = browser.contexts()[0];
		if (!context) throw new Error(`${command.browser} has no open window`);
		const tab =
			context.pages().find((open) => open.url().startsWith(SITE)) ?? (await context.newPage());
		const [first, second] = command.args;
		switch (command.verb) {
			case "snap":
				if (first) await tab.goto(`${SITE}${first}`, { waitUntil: "networkidle" });
				say(`${browser.version()} ${new URL(tab.url()).pathname}`);
				say(await tab.locator("body").ariaSnapshot());
				break;
			case "fill":
				await tab.getByRole("textbox", { name: first!, exact: true }).fill(second!);
				say(`filled ${first}`);
				break;
			case "click":
				// Windows Hello answers only the focused window: wait for the Product Owner to bring it up.
				await tab.bringToFront();
				await tab.waitForFunction(() => document.hasFocus(), null, {
					timeout: 120_000,
					polling: 500,
				});
				await tab.getByRole(first as Parameters<typeof tab.getByRole>[0], { name: second }).click();
				say(`clicked ${first} "${second}"`);
				break;
			case "shot":
				await tab.screenshot({ path: first! });
				say(`saved ${first}`);
				break;
			case "eval":
				say(JSON.stringify(await tab.evaluate(first!)));
				break;
		}
	} finally {
		await browser.close(); // detaches: the Product Owner's browser stays open
	}
}

async function main(): Promise<number> {
	const command = parseCommand(process.argv.slice(2));
	if ("error" in command) {
		process.stderr.write(`${command.error}\n`);
		return 2;
	}
	if (command.action === "tunnel") return tunnel();
	if (command.action === "probe") return (await probe()) ? 0 : 1;
	await page(command);
	return 0;
}

main().then(
	(code) => process.exit(code),
	(error: unknown) => {
		process.stderr.write(
			`drive: ${redact(error instanceof Error ? error.message : String(error))}\n`,
		);
		process.exit(1);
	},
);

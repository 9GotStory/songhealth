// The Windows client driver's rules (#457 retro; the control channel, #450 comment 7161099448):
// which tailnet peer is the Windows computer, what the command takes, and what never reaches its
// output. The planning module is scripts/windows-drive/plan.ts; scripts/windows-drive.ts runs it.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCommand, redact, windowsPeer } from "../../scripts/windows-drive/plan.ts";

const status = (peers: object[]) => JSON.stringify({ Peer: Object.fromEntries(peers.entries()) });

describe("the Windows computer in the tailnet", () => {
	it("is the peer whose OS is windows, by its IPv4 address, online or not", () => {
		const peers = [
			{ OS: "linux", Online: true, TailscaleIPs: ["198.51.100.2", "fd7a:115c:a1e0::2"] },
			{ OS: "windows", Online: true, TailscaleIPs: ["fd7a:115c:a1e0::9", "192.0.2.9"] },
		];
		assert.deepEqual(windowsPeer(status(peers)), { address: "192.0.2.9", online: true });
		assert.deepEqual(windowsPeer(status([{ ...peers[1], Online: false }])), {
			address: "192.0.2.9",
			online: false,
		});
	});

	it("is refused when no peer or more than one runs Windows", () => {
		const windows = { OS: "windows", Online: true, TailscaleIPs: ["192.0.2.9"] };
		assert.match((windowsPeer(status([])) as { error: string }).error, /no Windows computer/);
		assert.match(
			(windowsPeer(status([windows, windows])) as { error: string }).error,
			/2 Windows computers/,
		);
	});
});

describe("what the driver prints", () => {
	it("hides tailnet addresses and names, and leaves other text as it is", () => {
		assert.equal(
			redact("connect to 100.64.0.0 or 100.127.255.255 at host-1.tail0000.ts.net"),
			"connect to <address> or <address> at <tailnet name>",
		);
		assert.equal(redact("via fd7a:115c:a1e0:: port 22"), "via <address> port 22");
		assert.equal(
			redact("100.63.0.1 and 100.128.0.1 and 127.0.0.1"),
			"100.63.0.1 and 100.128.0.1 and 127.0.0.1",
		);
	});
});

describe("the command", () => {
	it("opens the tunnel, probes the browsers, or acts on one browser's page", () => {
		assert.deepEqual(parseCommand(["tunnel"]), { action: "tunnel" });
		assert.deepEqual(parseCommand(["probe"]), { action: "probe" });
		assert.deepEqual(parseCommand(["edge", "click", "button", "Sign in with Passkey"]), {
			action: "page",
			browser: "edge",
			verb: "click",
			args: ["button", "Sign in with Passkey"],
		});
		assert.deepEqual(parseCommand(["chrome", "snap"]), {
			action: "page",
			browser: "chrome",
			verb: "snap",
			args: [],
		});
	});

	it("refuses anything else with its usage", () => {
		for (const argv of [
			[],
			["firefox", "snap"],
			["edge", "type", "x"],
			["edge", "click", "button"],
			["tunnel", "x"],
		]) {
			const parsed = parseCommand(argv);
			assert.ok("error" in parsed, argv.join(" "));
			assert.match(parsed.error, /usage: node scripts\/windows-drive\.ts/);
		}
	});
});

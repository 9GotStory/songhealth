// The Windows client driver's rules (#457 retro), which scripts/windows-drive.ts applies on the
// workstation: which tailnet peer is the Product Owner's Windows computer, what the command takes,
// and the tailnet addresses and names it hides from its output. Nothing here runs a command or
// opens a connection, so node:test covers it (tests/node/windows-drive.test.ts). The channel itself
// is docs/operations/windows-client-runbook.md §2 (#450 comment 7161099448).

/** The workstation's end of each test browser's forwarded debugging port. */
export const LOCAL_PORTS = { chrome: 19222, edge: 19223 } as const;
export type Browser = keyof typeof LOCAL_PORTS;

const VERBS = { snap: [0, 1], fill: [2, 2], click: [2, 2], shot: [1, 1], eval: [1, 1] } as const;
type Verb = keyof typeof VERBS;

export type Command =
	| { action: "tunnel" }
	| { action: "probe" }
	| { action: "page"; browser: Browser; verb: Verb; args: string[] };

const USAGE = `usage: node scripts/windows-drive.ts <command>
  tunnel                          the SSH tunnel to both test browsers (runs until stopped)
  probe                           whether each test browser answers through the tunnel
  <chrome|edge> snap [path]       the page's accessibility tree, after opening the site's path
  <chrome|edge> fill <label> <value>
  <chrome|edge> click <role> <name>   once the browser's window has the focus
  <chrome|edge> shot <file>       a screenshot of the page
  <chrome|edge> eval <expression> the expression's JSON value in the page`;

export function parseCommand(argv: readonly string[]): Command | { error: string } {
	const [first, verb, ...args] = argv;
	if ((first === "tunnel" || first === "probe") && argv.length === 1) return { action: first };
	if ((first === "chrome" || first === "edge") && verb !== undefined && verb in VERBS) {
		const [least, most] = VERBS[verb as Verb];
		if (args.length >= least && args.length <= most) {
			return { action: "page", browser: first, verb: verb as Verb, args };
		}
	}
	return { error: USAGE };
}

interface Peer {
	OS?: string;
	Online?: boolean;
	TailscaleIPs?: string[];
}

/** The Windows computer among `tailscale status --json`'s peers: its IPv4 address and whether it
 * is online. The Product Owner's tailnet holds one Windows computer. */
export function windowsPeer(
	statusJson: string,
): { address: string; online: boolean } | { error: string } {
	const peers = Object.values(
		(JSON.parse(statusJson) as { Peer?: Record<string, Peer> }).Peer ?? {},
	);
	const windows = peers.filter((peer) => peer.OS === "windows");
	if (windows.length !== 1) {
		return {
			error:
				windows.length === 0
					? "no Windows computer in the tailnet: it joins as the runbook's §1 says"
					: `${windows.length} Windows computers in the tailnet: this driver expects the Product Owner's one`,
		};
	}
	const address = windows[0]!.TailscaleIPs?.find((ip) => ip.includes("."));
	if (!address) return { error: "the Windows computer has no IPv4 address in the tailnet" };
	return { address, online: windows[0]!.Online === true };
}

/** Tailnet addresses (100.64.0.0/10, fd7a:115c:a1e0::/48) and names (*.ts.net), which stay out of
 * every output and evidence (the runbook's "Placeholders"). */
export function redact(text: string): string {
	return text
		.replace(/\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/g, "<address>")
		.replace(/\bfd7a:115c:a1e0:[0-9a-f:]*/gi, "<address>")
		.replace(/\b[\w-]+(\.[\w-]+)*\.ts\.net\b/gi, "<tailnet name>");
}

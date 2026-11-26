// The Administrators' evidence scripts' rules (#457), which scripts/rehearsal-admins.ts applies on
// the workstation: what the command takes, and the one machine it runs against. Nothing here runs
// a command or opens a connection, so node:test covers it (tests/node/rehearsal-admins.test.ts).

import { isIP } from "node:net";

/** The name the site keeps after the DNS switch, which every passkey is bound to. */
export const SITE_NAME = "songhealth.moph.go.th";

/** The rehearsal machine's Internal Test CA (scripts/rehearsal/stand-in.sh `test-ca`). */
const REHEARSAL_CA = "Songhealth Rehearsal Internal Test CA (not for production)";

/** What the machine's TLS answer showed: the issuer's common name, the certificate's DNS names, and
 * whether it chains to the test authority's certificate the command was given. */
export interface Peer {
	authorized: boolean;
	error?: string;
	issuer: string;
	names: readonly string[];
}

/**
 * Why the scripts will not run against this machine, or null. Only the rehearsal machine's
 * certificate is issued by its Internal Test CA, so a virtual authenticator never meets the
 * Production host, where a person signs in and nothing automates a passkey (spec #450, "Testing
 * Decisions").
 */
export function targetRefusal(peer: Peer): string | null {
	if (peer.issuer !== REHEARSAL_CA) {
		return `the machine's certificate is issued by ${peer.issuer || "an unnamed issuer"}, not by "${REHEARSAL_CA}": these scripts run against the rehearsal machine only`;
	}
	if (!peer.authorized) {
		return `the machine's certificate does not chain to the Internal Test CA's certificate given (${peer.error ?? "unverified"})`;
	}
	if (!peer.names.includes(SITE_NAME)) {
		return `the machine's certificate is for ${peer.names.join(", ") || "no name"}, not for ${SITE_NAME}`;
	}
	return null;
}

const STEPS = ["preflight", "admins", "recovery"] as const;
type Step = (typeof STEPS)[number];

export interface Command {
	step: Step;
	address: string;
	ca: string;
	out: string;
	link?: string;
}

const USAGE = `usage: node scripts/rehearsal-admins.ts <step> <machine address> <test CA certificate> <evidence folder> [<link file>]
  preflight  the setup and development routes, from inside and outside the allowed network
  admins     the invitation, two passkeys, other names and addresses; the link file holds an
             invitation copied from the Admin, or is left out when a stored Administrator makes one
  recovery   the locked-out Administrator signs in with the link file's recovery link
             (scripts/admin-recovery.ts) and replaces their passkey`;

export function parseCommand(argv: readonly string[]): Command | { error: string } {
	const [step, address, ca, out, link, ...rest] = argv;
	const known = (STEPS as readonly string[]).includes(step ?? "");
	const linkOk =
		step === "recovery" ? link !== undefined : step !== "preflight" || link === undefined;
	if (!known || !address || isIP(address) === 0 || !ca || !out || !linkOk || rest.length > 0) {
		return { error: USAGE };
	}
	return { step: step as Step, address, ca, out, ...(link === undefined ? {} : { link }) };
}

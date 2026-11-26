// The emergency recovery link's rules (#457), which scripts/admin-recovery.ts applies on the host:
// what the command takes, whom it refuses, the row it writes into EmDash's token table and the link
// that row answers. Nothing here runs a command or touches a file, so node:test covers it
// (tests/node/admin-recovery.test.ts). Decision: #457 comment 7184244548. Read from EmDash 1.1.0
// and
// @emdash-cms/auth 1.1.0, the versions package.json pins.

import { createHash } from "node:crypto";

const USAGE = "usage: node scripts/admin-recovery.ts <email> <file>";
const EMAIL = /^[^\s@]+@[^\s@]+$/;

/** The locked-out Administrator's email, as EmDash stores it (lower case), and the link's file. */
export function parseCommand(
	argv: readonly string[],
): { email: string; file: string } | { error: string } {
	const [email, file] = argv;
	if (argv.length !== 2 || !EMAIL.test(email!) || !file) {
		return {
			error: `${USAGE}\n  <email>  the locked-out Administrator's email\n  <file>   a new file the link is written to, owner-only; it is never printed`,
		};
	}
	return { email: email!.toLowerCase(), file };
}

/** The Operator's approval: the word `yes`, typed, and nothing else. */
export function approved(answer: string): boolean {
	return answer.replace(/\n$/, "") === "yes";
}

/** `auth_tokens` as EmDash 1.1.0 has it (`src/database/migrations/008_auth.ts`). */
const TOKEN_COLUMNS = [
	"created_at",
	"email",
	"expires_at",
	"hash",
	"invited_by",
	"role",
	"type",
	"user_id",
];

/**
 * Why the row cannot be written into this table, or null: the column names psql listed, one a line.
 */
export function columnsRefusal(output: string): string | null {
	const columns = output
		.split("\n")
		.filter((line) => line !== "")
		.sort();
	if (columns.join(",") === TOKEN_COLUMNS.join(",")) return null;
	return `the auth_tokens table has the columns [${columns.join(", ")}], not EmDash 1.1.0's [${TOKEN_COLUMNS.join(", ")}]: read the installed EmDash's src/database/migrations and the facts file before writing a row`;
}

/** EmDash's recovery link lives 15 minutes (`@emdash-cms/auth` `src/magic-link/index.ts`). */
const LINK_MS = 15 * 60 * 1000;

/**
 * The row EmDash's own `sendMagicLink(…, "recovery")` writes, with its role and inviter left empty.
 */
export function recoveryRow(account: Account, email: string, hash: string, now: Date) {
	return {
		hash,
		user_id: account.id,
		email,
		type: "recovery",
		expires_at: new Date(now.getTime() + LINK_MS).toISOString(),
		created_at: now.toISOString(),
	} as const;
}

/**
 * The route that consumes the row and signs its account in
 * (`src/astro/routes/api/auth/magic-link/verify.ts`).
 */
export function recoveryLink(siteUrl: string, token: string): string {
	const url = new URL("/_emdash/api/auth/magic-link/verify", siteUrl);
	url.searchParams.set("token", token);
	return url.toString();
}

/**
 * The site URL from a `grep '^EMDASH_SITE_URL='` of the app's environment file: one HTTPS origin.
 */
export function parseSiteUrl(lines: string): string | { error: string } {
	const value =
		lines.startsWith("EMDASH_SITE_URL=") && lines.endsWith("\n") ? lines.slice(16, -1) : "";
	try {
		const url = new URL(value);
		if (url.protocol === "https:" && url.origin === value) return value;
	} catch {
		// refused below
	}
	return {
		error: "the app's environment file does not hold one EMDASH_SITE_URL=<https origin> line",
	};
}

/** EmDash's Administrator role level (`@emdash-cms/auth` `src/types.ts` `Role.ADMIN`). */
const ADMIN_ROLE = 50;

/** The account a link is made for, as `ACCOUNT_SQL` reads it. */
export interface Account {
	id: string;
	role: number;
	disabled: boolean;
	passkeys: number;
}

const ACCOUNT_ROW = /^([^|\n]+)\|(\d+)\|([01])\|(\d+)$/;

/** psql's unaligned output of `ACCOUNT_SQL`: no row, or one row of id, role, disabled, passkeys. */
export function parseAccount(output: string): Account | null {
	if (output === "") return null;
	const match = output.endsWith("\n") ? ACCOUNT_ROW.exec(output.slice(0, -1)) : null;
	if (!match)
		throw new Error("the account's query did not print one row of id|role|disabled|passkeys");
	return {
		id: match[1]!,
		role: Number(match[2]),
		disabled: match[3] === "1",
		passkeys: Number(match[4]),
	};
}

/**
 * Why no link is made for this account, or null. The link is for the day no Administrator can sign
 * in (spec #450, "Access before the cutover, and the Administrators"), so only for an
 * Administrator's own account.
 */
export function accountRefusal(account: Account | null, email: string): string | null {
	if (!account) {
		return `no account has the email ${email}: give the locked-out Administrator's email as the Admin's list of users shows it`;
	}
	if (account.role < ADMIN_ROLE) {
		return `${email} is not an Administrator (role ${account.role}): this link is for the day no Administrator can sign in, and only for an Administrator's account`;
	}
	if (account.disabled) {
		return `${email} is disabled: a disabled account cannot sign in, so a link would not let it in`;
	}
	return null;
}

/**
 * A link's token and the hash EmDash stores for it: the token is the bytes in base64url without
 * padding, the hash the SHA-256 of those bytes in the same encoding (`@emdash-cms/auth`
 * `src/tokens.ts` `generateToken`, `hashToken`; 32 bytes there too).
 */
export function tokenAndHash(bytes: Uint8Array): { token: string; hash: string } {
	return {
		token: Buffer.from(bytes).toString("base64url"),
		hash: createHash("sha256").update(bytes).digest("base64url"),
	};
}

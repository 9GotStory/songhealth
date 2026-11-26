// The emergency recovery link (#457; Product Owner, #457 comment 7184244548): for the day no
// Administrator can sign in, one link that signs the locked-out Administrator in to their own
// account once, so that they add a new passkey and remove the lost one.
//
//   node scripts/admin-recovery.ts <the locked-out Administrator's email> <a new file for the link>
//
// The native gap: with no email provider EmDash 1.1.0 has no supported recovery
// (docs/agents/emdash-1.1.0.md, "Authentication and setup"). Its own magic-link route consumes a
// `recovery` row of its `auth_tokens` table and signs that row's account in, email or not; this
// command writes that row as EmDash's own `sendMagicLink(…, "recovery")` writes it, and nothing
// else. It is a direct write to the database, so it waits for the Operator's typed `yes`, and it is
// never run on production without the Operator's approval
// (docs/operations/administrator-recovery.md).
//
// Run it on the host as the Deployment account, from a checkout at the deployed commit or with
// scripts/admin-recovery.ts, scripts/admin-recovery/ and scripts/recovery-set/ copied in their
// layout, on the Node `package.json` pins. It reads the database's and its administrator's names
// from the db container and the site URL by a `grep` of the app's environment file, so no
// credential is read, asked for or printed. The link goes into a new owner-only file and is never
// printed. Exits: 0 done; 1 refused or failed, with nothing written to the database.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, fsyncSync, lstatSync, openSync, unlinkSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

import {
	accountRefusal,
	approved,
	columnsRefusal,
	parseAccount,
	parseCommand,
	parseSiteUrl,
	recoveryLink,
	recoveryRow,
	tokenAndHash,
} from "./admin-recovery/plan.ts";
import { parseDatabaseNames, RUNTIMES } from "./recovery-set/plan.ts";

const RUNTIME = RUNTIMES.production;
const APP_ENV = join(homedir(), ".config/containers/systemd/songhealth-app.env");
/** Stable tool output whatever the host's locale. */
const ENV = { ...process.env, LC_ALL: "C" };

class Refusal extends Error {}

function say(line: string): void {
	process.stdout.write(`admin-recovery: ${line}\n`);
}

function run(command: string, args: readonly string[], what: string, input?: string): string {
	const result = spawnSync(command, args, { encoding: "utf8", env: ENV, input });
	if (result.status !== 0) {
		throw new Refusal(`${what} failed: ${(result.stderr || result.error?.message || "").trim()}`);
	}
	return result.stdout;
}

/** One psql script as the database's administrator, over the db container's local socket. */
function psql(
	db: { database: string; admin: string },
	script: string,
	what: string,
	vars: Record<string, string> = {},
): string {
	const sets = Object.entries(vars).flatMap(([name, value]) => ["-v", `${name}=${value}`]);
	return run(
		"podman",
		[
			"exec",
			"-i",
			RUNTIME.dbContainer,
			"psql",
			"-X",
			"-q",
			"-At",
			"-v",
			"ON_ERROR_STOP=1",
			...sets,
			"-U",
			db.admin,
			"-d",
			db.database,
			"-f",
			"-",
		],
		what,
		script,
	);
}

const COLUMNS_SQL = `SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'auth_tokens';`;

const ACCOUNT_SQL = `SELECT u.id, u.role, u.disabled,
  (SELECT count(*) FROM credentials c WHERE c.user_id = u.id)
FROM users u WHERE u.email = :'email';`;

const INSERT_SQL = `INSERT INTO auth_tokens (hash, user_id, email, type, expires_at, created_at)
VALUES (:'hash', :'user_id', :'email', :'type', :'expires_at', :'created_at');`;

async function ask(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await new Promise<string>((done) => {
		rl.question(question, done);
		rl.once("close", () => done(""));
	});
	rl.close();
	return answer;
}

async function main(): Promise<void> {
	const command = parseCommand(process.argv.slice(2));
	if ("error" in command) throw new Refusal(command.error);
	const { email, file } = command;
	if (lstatSync(file, { throwIfNoEntry: false })) {
		throw new Refusal(
			`${file} exists: give a new file, so that no link is left behind in an old one`,
		);
	}

	const db = parseDatabaseNames(
		run(
			"podman",
			["exec", RUNTIME.dbContainer, "printenv", "POSTGRES_DB", "POSTGRES_USER"],
			"reading the db container's names",
		),
	);
	if ("error" in db) throw new Refusal(db.error);
	// grep prints the site URL's line alone: the file's password never reaches this process.
	const siteUrl = parseSiteUrl(
		spawnSync("grep", ["-E", "^EMDASH_SITE_URL=", APP_ENV], { encoding: "utf8", env: ENV })
			.stdout ?? "",
	);
	if (typeof siteUrl !== "string") throw new Refusal(siteUrl.error);

	const columns = columnsRefusal(psql(db, COLUMNS_SQL, "reading auth_tokens' columns"));
	if (columns) throw new Refusal(columns);
	const account = parseAccount(psql(db, ACCOUNT_SQL, "reading the account", { email }));
	const refusal = accountRefusal(account, email);
	if (refusal || !account) throw new Refusal(refusal ?? "no account");

	say(`${email} is an Administrator with ${account.passkeys} passkey(s) at ${siteUrl}.`);
	say("This writes one recovery link for that account into the database: it signs the account in");
	say(
		"once, within 15 minutes, with no passkey. It needs the Operator's approval each time it runs,",
	);
	say("and on production it is never run without that approval.");
	if (!approved(await ask("admin-recovery: type yes to write the link: "))) {
		throw new Refusal("not approved: nothing was written");
	}

	const { token, hash } = tokenAndHash(randomBytes(32));
	const row = recoveryRow(account, email, hash, new Date());
	const fd = openSync(file, "wx", 0o600);
	try {
		psql(db, INSERT_SQL, "writing the recovery row", row);
		writeSync(fd, `${recoveryLink(siteUrl, token)}\n`);
		fsyncSync(fd);
	} catch (error) {
		closeSync(fd);
		unlinkSync(file);
		throw error;
	}
	closeSync(fd);
	say(`the link is in ${file} (owner-only); it signs ${email} in once, until ${row.expires_at}.`);
	say(`Open it on the Administrator's computer under ${siteUrl}, then delete the file.`);
}

main().catch((error: unknown) => {
	const message = error instanceof Refusal ? error.message : String(error);
	process.stderr.write(`admin-recovery: ${message}\n`);
	process.exit(1);
});

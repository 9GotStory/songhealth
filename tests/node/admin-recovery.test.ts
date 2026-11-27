// The emergency recovery link (#457; Product Owner, #457 comment 7184244548): what the command
// takes, the link it makes, whom it refuses and what it writes into EmDash's token table. The
// planning module is scripts/admin-recovery/plan.ts; scripts/admin-recovery.ts runs it on the host.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashToken } from "@emdash-cms/auth";

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
} from "../../scripts/admin-recovery/plan.ts";

describe("the command", () => {
	it("takes the locked-out Administrator's email and the file the link goes to", () => {
		assert.deepEqual(parseCommand(["Admin@Songhealth.invalid", "/home/songhealth/link.txt"]), {
			email: "admin@songhealth.invalid",
			file: "/home/songhealth/link.txt",
		});
	});

	it("refuses anything else with its usage", () => {
		for (const argv of [
			[],
			["admin@songhealth.invalid"],
			["not-an-email", "f"],
			["a@b", "f", "x"],
		]) {
			const parsed = parseCommand(argv);
			assert.ok("error" in parsed, argv.join(" "));
			assert.match(parsed.error, /usage: node scripts\/admin-recovery\.ts <email> <file>/);
		}
	});

	it("goes on only when the Operator types yes", () => {
		assert.equal(approved("yes\n"), true);
		assert.equal(approved("yes"), true);
		for (const answer of ["", "y", "YES", "no", "yes please"])
			assert.equal(approved(answer), false, answer);
	});
});

describe("EmDash's token table", () => {
	const COLUMNS = "created_at\nemail\nexpires_at\nhash\ninvited_by\nrole\ntype\nuser_id\n";

	it("is admitted with EmDash 1.1.0's eight columns, in any order", () => {
		assert.equal(columnsRefusal(COLUMNS), null);
		assert.equal(columnsRefusal(COLUMNS.split("\n").reverse().join("\n").slice(1) + "\n"), null);
	});

	it("is refused when a column is missing or added: another EmDash may read the row otherwise", () => {
		assert.match(columnsRefusal(COLUMNS.replace("role\n", ""))!, /auth_tokens.*EmDash 1\.1\.0/);
		assert.match(columnsRefusal(COLUMNS + "purpose\n")!, /auth_tokens.*EmDash 1\.1\.0/);
		assert.match(columnsRefusal("")!, /auth_tokens/);
	});
});

describe("the row and its link", () => {
	const now = new Date("2026-11-26T09:00:00.000Z");
	const account = { id: "01JX", role: 50, disabled: false, passkeys: 1 };

	it("is EmDash's own recovery row: the account's id and email, used once within 15 minutes", () => {
		assert.deepEqual(recoveryRow(account, "admin@songhealth.invalid", "HASH", now), {
			hash: "HASH",
			user_id: "01JX",
			email: "admin@songhealth.invalid",
			type: "recovery",
			expires_at: "2026-11-26T09:15:00.000Z",
			created_at: "2026-11-26T09:00:00.000Z",
		});
	});

	it("is answered at the site's own magic-link route, under the configured site URL", () => {
		assert.equal(
			recoveryLink("https://songhealth.moph.go.th", "TOKEN"),
			"https://songhealth.moph.go.th/_emdash/api/auth/magic-link/verify?token=TOKEN",
		);
	});

	it("takes the site URL from the app's environment file's EMDASH_SITE_URL line", () => {
		assert.equal(
			parseSiteUrl("EMDASH_SITE_URL=https://songhealth.moph.go.th\n"),
			"https://songhealth.moph.go.th",
		);
		for (const lines of [
			"",
			"EMDASH_SITE_URL=http://songhealth.moph.go.th\n",
			"EMDASH_SITE_URL=https://songhealth.moph.go.th/admin\n",
			"EMDASH_SITE_URL=https://a\nEMDASH_SITE_URL=https://b\n",
		]) {
			const parsed = parseSiteUrl(lines);
			assert.ok(typeof parsed !== "string", lines);
		}
	});
});

describe("the account a link is made for", () => {
	it("is read from psql's one unaligned row: id, role, disabled and its passkeys", () => {
		assert.deepEqual(parseAccount("01JX|50|0|2\n"), {
			id: "01JX",
			role: 50,
			disabled: false,
			passkeys: 2,
		});
		assert.deepEqual(parseAccount("01JX|30|1|0\n"), {
			id: "01JX",
			role: 30,
			disabled: true,
			passkeys: 0,
		});
		assert.equal(parseAccount(""), null);
	});

	it("refuses an output psql did not print as one row", () => {
		assert.throws(() => parseAccount("01JX|50|0|2\n01JY|50|0|1\n"), /one row/);
		assert.throws(() => parseAccount("01JX|admin|0|2\n"), /one row/);
	});

	it("is an Administrator who is not disabled", () => {
		const admin = { id: "01JX", role: 50, disabled: false, passkeys: 1 };
		assert.equal(accountRefusal(admin, "a@songhealth.invalid"), null);
		assert.match(
			accountRefusal(null, "a@songhealth.invalid")!,
			/no account has the email a@songhealth\.invalid/,
		);
		assert.match(
			accountRefusal({ ...admin, role: 40 }, "a@songhealth.invalid")!,
			/not an Administrator \(role 40\)/,
		);
		assert.match(accountRefusal({ ...admin, disabled: true }, "a@songhealth.invalid")!, /disabled/);
	});
});

describe("the recovery link's token", () => {
	it("is stored as the hash EmDash computes for the same link", () => {
		const bytes = new Uint8Array(32).map((_, i) => (i * 37 + 11) % 256);
		const { token, hash } = tokenAndHash(bytes);
		assert.equal(hash, hashToken(token));
		assert.notEqual(hash, token);
	});

	it("is 32 random bytes in base64url without padding, as EmDash's own tokens are", () => {
		const { token } = tokenAndHash(new Uint8Array(32).fill(255));
		assert.equal(token, "_".repeat(42) + "8");
	});
});

// The Administrators' evidence scripts on the rehearsal machine (#457; spec #450 "Testing
// Decisions", the Playwright evidence scripts): what they take, and the machine they refuse to run
// against. The planning module is scripts/rehearsal-admins/plan.ts; scripts/rehearsal-admins.ts
// runs it on the workstation.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCommand, targetRefusal } from "../../scripts/rehearsal-admins/plan.ts";

const REHEARSAL = {
	authorized: true,
	issuer: "Songhealth Rehearsal Internal Test CA (not for production)",
	names: ["songhealth.moph.go.th"],
};

describe("the machine the scripts run against", () => {
	it("is the rehearsal machine: the site's name, under a certificate its Internal Test CA issued", () => {
		assert.equal(targetRefusal(REHEARSAL), null);
	});

	it("is refused under any other issuer, so that a virtual authenticator never meets production", () => {
		const refusal = targetRefusal({
			...REHEARSAL,
			issuer: "Sectigo RSA Domain Validation Secure Server CA",
		});
		assert.match(refusal!, /issued by Sectigo RSA Domain Validation Secure Server CA/);
		assert.match(refusal!, /rehearsal machine only/);
	});

	it("is refused when the certificate does not chain to the test authority's file given", () => {
		assert.match(
			targetRefusal({ ...REHEARSAL, authorized: false, error: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" })!,
			/does not chain to the Internal Test CA.*UNABLE_TO_VERIFY_LEAF_SIGNATURE/,
		);
	});

	it("is refused when the certificate is not the site's name", () => {
		assert.match(
			targetRefusal({ ...REHEARSAL, names: ["name-check.invalid"] })!,
			/not for songhealth\.moph\.go\.th/,
		);
	});
});

describe("the command", () => {
	const machine = ["192.0.2.7", "/s/test-ca.crt", "/e/out"];

	it("takes a step, the machine's address, the test authority's certificate and an evidence folder", () => {
		assert.deepEqual(parseCommand(["preflight", ...machine]), {
			step: "preflight",
			address: "192.0.2.7",
			ca: "/s/test-ca.crt",
			out: "/e/out",
		});
	});

	it("takes the file of the link that the invitation and the recovery steps open", () => {
		assert.deepEqual(parseCommand(["admins", ...machine, "/s/invite"]), {
			step: "admins",
			address: "192.0.2.7",
			ca: "/s/test-ca.crt",
			out: "/e/out",
			link: "/s/invite",
		});
		assert.deepEqual(parseCommand(["admins", ...machine]), {
			step: "admins",
			address: "192.0.2.7",
			ca: "/s/test-ca.crt",
			out: "/e/out",
		});
		assert.ok("error" in parseCommand(["recovery", ...machine]));
	});

	it("takes the sign-in after a restore without a link file, and refuses one (#461)", () => {
		assert.deepEqual(parseCommand(["signin", ...machine]), {
			step: "signin",
			address: "192.0.2.7",
			ca: "/s/test-ca.crt",
			out: "/e/out",
		});
		assert.ok("error" in parseCommand(["signin", ...machine, "/s/link"]));
	});

	it("refuses an unknown step, a missing argument or a name in place of the address", () => {
		for (const argv of [
			[],
			["deploy", ...machine],
			["preflight", "/s/test-ca.crt", "/e/out"],
			["preflight", "songhealth.moph.go.th", "/s/c", "/e"],
		]) {
			const parsed = parseCommand(argv);
			assert.ok("error" in parsed, argv.join(" "));
			assert.match(parsed.error, /usage: node scripts\/rehearsal-admins\.ts/);
		}
	});
});

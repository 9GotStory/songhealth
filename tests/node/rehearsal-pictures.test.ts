// The pictures' evidence script on the rehearsal machine (#458): what it takes, and when a view's
// pictures pass with /_image refused at the proxy and the site's own thumbnails redirected. The
// planning module is scripts/rehearsal-pictures/plan.ts; scripts/rehearsal-pictures.ts runs it.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	parseCommand,
	pictureVerdict,
	PUBLIC_PAGES,
	WIDTHS,
} from "../../scripts/rehearsal-pictures/plan.ts";

const shown = (src: string) => ({ src, shown: true });
const broken = (src: string) => ({ src, shown: false });
const MEDIA = "https://songhealth.moph.go.th/_emdash/api/media/file/";

describe("the command", () => {
	it("takes a step, the machine's address, the test authority's certificate and where to write", () => {
		for (const step of ["token", "admin", "public", "upload"]) {
			assert.deepEqual(parseCommand([step, "192.0.2.9", "ca.crt", "out"]), {
				step,
				address: "192.0.2.9",
				ca: "ca.crt",
				out: "out",
			});
		}
	});

	it("refuses an unknown step, a name for an address, and a missing or extra argument", () => {
		for (const argv of [
			["preflight", "192.0.2.9", "ca.crt", "out"],
			["admin", "songhealth.moph.go.th", "ca.crt", "out"],
			["admin", "192.0.2.9", "ca.crt"],
			["admin", "192.0.2.9", "ca.crt", "out", "more"],
		]) {
			const command = parseCommand(argv);
			assert.ok("error" in command, argv.join(" "));
			assert.match(command.error, /usage: node scripts\/rehearsal-pictures\.ts/);
		}
	});

	it("reads phone and desktop widths", () => {
		assert.deepEqual(WIDTHS, [390, 1440]);
	});

	it("opens each kind of public page that shows a picture, and an entry of each list with one", () => {
		assert.deepEqual(
			PUBLIC_PAGES.map(({ path, firstEntryOf }) => firstEntryOf ?? path),
			[
				"/",
				"/news",
				"/news/health",
				"/news/",
				"/activities",
				"/activities/",
				"/health/content",
				"/health/content/",
				"/about/leadership",
				"/about/personnel",
			],
		);
	});
});

describe("a view's pictures", () => {
	it("pass in the Admin when every picture shows and each /_image request was redirected", () => {
		const verdict = pictureVerdict(
			"admin",
			[shown(`${MEDIA}a.png`), shown(`${MEDIA}b.png`)],
			[302, 302],
		);
		assert.deepEqual(verdict, { pass: true, evidence: "2 pictures, all shown; /_image 302×2" });
	});

	it("fail in the Admin when a picture does not show, naming it without its query", () => {
		const verdict = pictureVerdict(
			"admin",
			[shown(`${MEDIA}a.png`), broken(`${MEDIA}b.png?_emdash_media=x`)],
			[302],
		);
		assert.deepEqual(verdict, {
			pass: false,
			evidence: "1 of 2 not shown (/_emdash/api/media/file/b.png); /_image 302×1",
		});
	});

	it("fail in the Admin when a /_image request was refused or rendered, though the fallback showed it", () => {
		assert.equal(pictureVerdict("admin", [shown(`${MEDIA}a.png`)], [403]).pass, false);
		assert.equal(pictureVerdict("admin", [shown(`${MEDIA}a.png`)], [200, 302]).pass, false);
	});

	it("pass on a public page that asks for no /_image, and fail on one that does", () => {
		assert.deepEqual(pictureVerdict("public", [shown(`${MEDIA}a.png`)], []), {
			pass: true,
			evidence: "1 pictures, all shown; no /_image request",
		});
		assert.equal(pictureVerdict("public", [shown(`${MEDIA}a.png`)], [302]).pass, false);
	});

	it("fail with no picture at all, which proves nothing", () => {
		assert.deepEqual(pictureVerdict("public", [], []), {
			pass: false,
			evidence: "no picture; no /_image request",
		});
	});
});

// The Service catalog (#58; spec #51 "Public reads" (Services), `03` §7 and §15).
//
// - The catalog's Service Category filter lives in the address (`?category=`), so a filtered
//   catalog can be shared and reproduces the same results.
// - A Service's canonical address is `/services/{slug}`, encoded as EmDash encodes it.
// - A link to another website is marked as leaving the site and opens in a new tab; a link on
//   this site, an email address or a telephone number is not (#51 user story 38).
// - A guidance field that holds no text is left out of a Service page, however the editor saved it
//   empty: no blocks, or a paragraph with no text in it.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isExternalHref } from "../../src/lib/links.ts";
import {
	hasGuidance,
	parseServiceFilters,
	servicePath,
	servicesPath,
} from "../../src/lib/service-catalog.ts";

describe("the catalog's address", () => {
	it("reads the Service Category from ?category=, trimmed, and nothing when it is absent", () => {
		assert.deepEqual(parseServiceFilters(new URLSearchParams("category=%20complaint%20")), {
			category: "complaint",
		});
		assert.deepEqual(parseServiceFilters(new URLSearchParams("page=2")), { category: "" });
	});

	it("keeps a set category in the address and drops an empty one", () => {
		assert.equal(servicesPath(), "/services");
		assert.equal(servicesPath({ category: "" }), "/services");
		assert.equal(
			servicesPath({ category: "ร้องเรียน" }),
			"/services?category=%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99",
		);
	});

	it("gives each Service its canonical /services/{slug} address", () => {
		assert.equal(servicePath("complaint"), "/services/complaint");
		assert.equal(
			servicePath("ร้องเรียน"),
			"/services/%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99",
		);
	});
});

describe("isExternalHref", () => {
	const site = "https://songhealth.example";

	it("is true for a web address on another host", () => {
		assert.equal(isExternalHref("https://www.nhso.go.th/page", site), true);
		assert.equal(isExternalHref("http://songhealth.example.other/", site), true);
	});

	it("is false for an address on this site, absolute or site-relative", () => {
		assert.equal(isExternalHref("https://songhealth.example/documents/form", site), false);
		assert.equal(isExternalHref("/documents/form", site), false);
		assert.equal(isExternalHref("#steps", site), false);
	});

	it("is false for an email address or a telephone number, which open no website", () => {
		assert.equal(isExternalHref("mailto:office@example.go.th", site), false);
		assert.equal(isExternalHref("tel:054000000", site), false);
	});
});

describe("hasGuidance", () => {
	const paragraph = (...texts: string[]) => ({
		_type: "block",
		children: texts.map((text) => ({ _type: "span", text })),
	});

	it("is false for a field with no blocks, or only paragraphs without text", () => {
		assert.equal(hasGuidance(undefined), false);
		assert.equal(hasGuidance(null), false);
		assert.equal(hasGuidance([]), false);
		assert.equal(hasGuidance([paragraph(""), paragraph(" ", "\n")]), false);
	});

	it("is true once any paragraph has text, or the field holds a block that is not a paragraph", () => {
		assert.equal(hasGuidance([paragraph(""), paragraph("ยื่นแบบคำร้อง")]), true);
		assert.equal(hasGuidance([{ _type: "image" }]), true);
	});
});

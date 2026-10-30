// Office Contact and the official channels (#62; spec #51 "Office Contact plugin" and "Public reads"
// (Contact), `01` §10, `03` §12).
//
// - Office Contact comes from the Office Contact plugin's settings. A value that is empty, or not
//   of its field's type, is left out, so its line disappears from the page.
// - The official channels are the native `social` settings and LINE. The Admin asks for a
//   username or handle in each `social` field (@emdash-cms/admin 1.1.0), so a handle becomes the
//   network's profile address; a pasted web address is kept as it is.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	OFFICE_CONTACT_SETTINGS,
	officeContactFrom,
	officialChannels,
	telephoneHref,
} from "../../src/lib/contact.ts";

describe("the Office Contact plugin's settings form", () => {
	it("asks for each Office Contact value with the field type that checks it", () => {
		assert.deepEqual(
			Object.fromEntries(
				Object.entries(OFFICE_CONTACT_SETTINGS).map(([key, field]) => [key, field.type]),
			),
			{
				address: "string",
				telephone: "string",
				email: "email",
				opening_hours: "string",
				latitude: "number",
				longitude: "number",
				line_url: "url",
			},
		);
	});

	it("takes the address and opening hours on several lines, and only coordinates on Earth", () => {
		const { address, opening_hours, latitude, longitude } = OFFICE_CONTACT_SETTINGS;
		assert.deepEqual(
			[address, opening_hours].map((field) => field?.type === "string" && field.multiline),
			[true, true],
		);
		assert.deepEqual(
			[latitude, longitude].map((field) => field?.type === "number" && [field.min, field.max]),
			[
				[-90, 90],
				[-180, 180],
			],
		);
	});

	it("labels every field in Thai", () => {
		const unlabelled = Object.entries(OFFICE_CONTACT_SETTINGS)
			.filter(([, field]) => !/[\u0E00-\u0E7F]/.test(field.label))
			.map(([key]) => key);
		assert.deepEqual(unlabelled, []);
	});
});

describe("Office Contact from the plugin settings", () => {
	it("keeps every value that is set, trimmed", () => {
		assert.deepEqual(
			officeContactFrom({
				address: "  123 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120 ",
				telephone: " 054 591 234 ",
				email: "songhealth@example.go.th",
				opening_hours: "จันทร์–ศุกร์ 08:30–16:30 น.",
				latitude: 18.4686,
				longitude: 100.1834,
				line_url: "https://line.me/R/ti/p/@songhealth",
			}),
			{
				address: "123 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120",
				telephone: "054 591 234",
				email: "songhealth@example.go.th",
				openingHours: "จันทร์–ศุกร์ 08:30–16:30 น.",
				latitude: 18.4686,
				longitude: 100.1834,
				lineUrl: "https://line.me/R/ti/p/@songhealth",
			},
		);
	});

	it("leaves out what is unset, empty or blank", () => {
		assert.deepEqual(officeContactFrom({}), {});
		assert.deepEqual(
			officeContactFrom({ address: "", telephone: "   ", email: null, opening_hours: "\n" }),
			{},
		);
	});
});

describe("the telephone link", () => {
	it("dials one number however staff spaced it", () => {
		assert.equal(telephoneHref("054 591 234"), "tel:054591234");
		assert.equal(telephoneHref("054-591234"), "tel:054591234");
		assert.equal(telephoneHref("(054) 591.234"), "tel:054591234");
		assert.equal(telephoneHref("+66 54 591 234"), "tel:+6654591234");
		assert.equal(telephoneHref("1669"), "tel:1669");
	});

	it("is absent when the text is not one number, so the text shows unlinked", () => {
		assert.equal(telephoneHref("054-591234 ต่อ 12"), undefined);
		assert.equal(telephoneHref("054-591234, 054-591235"), undefined);
		assert.equal(telephoneHref("โทร 054591234"), undefined);
		assert.equal(telephoneHref("12"), undefined);
	});
});

describe("the official channels", () => {
	const LINE = "https://line.me/R/ti/p/@songhealth";

	it("link each handle the Admin asks for to its profile, Facebook, LINE and YouTube first", () => {
		assert.deepEqual(
			officialChannels(
				{
					twitter: "@songhealth",
					github: "songhealth",
					facebook: "songhealth.office",
					instagram: "songhealth_",
					linkedin: "songhealth",
					youtube: "@songhealthtv",
				},
				LINE,
			),
			[
				{ label: "Facebook", href: "https://www.facebook.com/songhealth.office" },
				{ label: "LINE", href: LINE },
				{ label: "YouTube", href: "https://www.youtube.com/@songhealthtv" },
				{ label: "X (Twitter)", href: "https://x.com/songhealth" },
				{ label: "Instagram", href: "https://www.instagram.com/songhealth_" },
				{ label: "LinkedIn", href: "https://www.linkedin.com/in/songhealth" },
				{ label: "GitHub", href: "https://github.com/songhealth" },
			],
		);
	});

	it("open a YouTube channel by its ID, and a handle given without its @", () => {
		assert.deepEqual(officialChannels({ youtube: "UCabcdefghijklmnopqrstuv" }), [
			{ label: "YouTube", href: "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv" },
		]);
		assert.deepEqual(officialChannels({ youtube: "songhealthtv" }), [
			{ label: "YouTube", href: "https://www.youtube.com/@songhealthtv" },
		]);
	});

	it("keep a web address staff pasted instead of a handle", () => {
		const page = "https://www.facebook.com/profile.php?id=100064000000000";
		assert.deepEqual(officialChannels({ facebook: ` ${page} ` }), [
			{ label: "Facebook", href: page },
		]);
	});

	it("leave out a channel that is unset, empty, or neither a handle nor a web address", () => {
		assert.deepEqual(officialChannels(undefined, undefined), []);
		assert.deepEqual(officialChannels({ facebook: "", youtube: "  " }), []);
		assert.deepEqual(
			officialChannels(
				{ facebook: "สสอ.สอง", twitter: "javascript:alert(1)", github: "songhealth/x" },
				"line://ti/p/@songhealth",
			),
			[],
		);
	});
});

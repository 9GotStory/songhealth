// The Health Service Directory (#57; spec #51 "Public reads" (Health Service Directory) and
// "Maps").
//
// - The name filter matches a substring of a Health Service's official name or display name.
//   Both sides are compared in NFC, with Latin letters lower-cased, zero-width characters removed
//   and whitespace collapsed, as the search normalises text (spec #51 "Search").
// - The Area filter matches the exact Area term, and offers only the Area terms Health Services
//   use: the `area` taxonomy also classifies News, Activities and Health Reports.
// - A Health Service is shown by its display name, else its official name, and the directory
//   lists them by that name in Thai order.
// - The filters live in the address (`?area=`, `?name=`), so a filtered list can be shared and
//   reproduces the same results.
// - "เปิดแผนที่" is a Google Maps URL built from the coordinates (Maps URLs: the search action with
//   `api=1` and `query=lat%2Clng`, no API key), left out when the coordinates are missing.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	areasInUse,
	byName,
	directoryPath,
	type DirectoryData,
	filterDirectory,
	healthServicePath,
	parseDirectoryFilters,
	shownName,
} from "../../src/lib/health-service-directory.ts";
import { mapHref } from "../../src/lib/map-link.ts";

/** A published Health Service as the query functions return it. */
function healthService(
	id: string,
	title: string,
	options: { display_name?: string | null; areas?: string[] } = {},
) {
	return {
		id,
		data: {
			title,
			display_name: options.display_name,
			terms: { area: (options.areas ?? []).map((slug) => ({ slug, label: `พื้นที่ ${slug}` })) },
		},
	};
}

const ids = (entries: ReadonlyArray<{ id: string }>) => entries.map(({ id }) => id);

describe("filterDirectory by name", () => {
	const hospital = healthService("hospital", "โรงพยาบาลสอง");
	const clinic = healthService("clinic", "โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง", {
		display_name: "รพ.สต.บ้านกลาง",
	});
	const all = [hospital, clinic];

	it("keeps every Health Service when no name is given", () => {
		assert.deepEqual(ids(filterDirectory(all, { area: "", name: "" })), ["hospital", "clinic"]);
	});

	it("matches a substring of the official name or of the display name", () => {
		assert.deepEqual(ids(filterDirectory(all, { area: "", name: "บ้านกลาง" })), ["clinic"]);
		assert.deepEqual(ids(filterDirectory(all, { area: "", name: "รพ.สต." })), ["clinic"]);
		assert.deepEqual(ids(filterDirectory(all, { area: "", name: "โรงพยาบาล" })), [
			"hospital",
			"clinic",
		]);
		assert.deepEqual(ids(filterDirectory(all, { area: "", name: "คลินิก" })), []);
	});

	it("compares names in NFC, ignoring Latin case, zero-width characters and extra whitespace", () => {
		const latin = healthService("latin", "Songkhla Café Clinic", { display_name: "บ้าน  กลาง" });
		const entries = [latin];
		const match = (name: string) => ids(filterDirectory(entries, { area: "", name }));
		assert.deepEqual(match("CAFÉ"), ["latin"], "NFD input matches the NFC name");
		assert.deepEqual(match("songkhla"), ["latin"], "Latin letters in any case");
		assert.deepEqual(match("บ้าน ​กลาง﻿"), ["latin"], "zero-width characters removed");
		assert.deepEqual(match("  บ้าน   กลาง  "), ["latin"], "whitespace collapsed and trimmed");
		assert.deepEqual(match("บ้านกลาง"), [], "a space in the name still separates its words");
	});
});

describe("filterDirectory by Area", () => {
	const north = healthService("north", "รพ.สต.บ้านเหนือ", { areas: ["tambon-north"] });
	const both = healthService("both", "โรงพยาบาลสอง", { areas: ["tambon-north", "tambon-south"] });
	const village = healthService("village", "รพ.สต.บ้านใต้", { areas: ["moo-1-south"] });
	const none = healthService("none", "หน่วยบริการไม่มีพื้นที่");
	const all = [north, both, village, none];

	it("keeps the Health Services tagged with exactly that Area term", () => {
		assert.deepEqual(ids(filterDirectory(all, { area: "tambon-north", name: "" })), [
			"north",
			"both",
		]);
		assert.deepEqual(
			ids(filterDirectory(all, { area: "tambon-south", name: "" })),
			["both"],
			"a parent Area does not take in its children",
		);
	});

	it("matches nothing for an Area term no Health Service has", () => {
		assert.deepEqual(ids(filterDirectory(all, { area: "no-such-area", name: "" })), []);
	});

	it("combines with the name filter", () => {
		assert.deepEqual(ids(filterDirectory(all, { area: "tambon-north", name: "รพ.สต." })), [
			"north",
		]);
	});
});

describe("areasInUse", () => {
	it("offers each Area term the Health Services use once, by label in Thai order", () => {
		const term = (slug: string, label: string) => ({ slug, label });
		const entries: { data: DirectoryData }[] = [
			{ data: { title: "ก", terms: { area: [term("tambon-song", "ตำบลสอง")] } } },
			{
				data: {
					title: "ข",
					terms: {
						area: [term("tambon-ban-klang", "ตำบลบ้านกลาง"), term("tambon-song", "ตำบลสอง")],
					},
				},
			},
			{ data: { title: "ค", terms: { area: [term("moo-1", "หมู่ 1 บ้านกลาง")] } } },
			{ data: { title: "ง", terms: { facility_type: [term("hospital", "โรงพยาบาล")] } } },
			{ data: { title: "จ" } },
		];
		assert.deepEqual(areasInUse(entries), [
			term("tambon-ban-klang", "ตำบลบ้านกลาง"),
			term("tambon-song", "ตำบลสอง"),
			term("moo-1", "หมู่ 1 บ้านกลาง"),
		]);
	});
});

describe("shownName and byName", () => {
	it("shows the display name, else the official name", () => {
		assert.equal(
			shownName({ title: "โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง", display_name: "รพ.สต.บ้านกลาง" }),
			"รพ.สต.บ้านกลาง",
		);
		assert.equal(shownName({ title: "โรงพยาบาลสอง", display_name: null }), "โรงพยาบาลสอง");
		assert.equal(shownName({ title: "โรงพยาบาลสอง", display_name: "  " }), "โรงพยาบาลสอง");
	});

	it("lists by the shown name in Thai dictionary order, then by slug", () => {
		const entries = [
			healthService("office", "สำนักงานสาธารณสุขอำเภอสอง"),
			healthService("kok-2", "รพ.สต.บ้านกอก"),
			healthService("klang", "รพ.สต.บ้านกลาง"),
			// By its official name (ศ) it would come after ร; it is shown, and listed, as ค.
			healthService("clinic", "ศูนย์สุขภาพชุมชนบ้านกลาง", {
				display_name: "คลินิกหมอครอบครัวบ้านกลาง",
			}),
			healthService("kok-1", "รพ.สต.บ้านกอก"),
		];
		// ค < ร < ส, and ล < อ, in the Thai alphabet.
		assert.deepEqual(ids(byName(entries)), ["clinic", "klang", "kok-1", "kok-2", "office"]);
	});
});

describe("the directory's address", () => {
	it("reads the Area and name filters from the query string, trimmed", () => {
		const params = new URLSearchParams("area=%20tambon-song%20&name=%20รพ.สต.%20&page=2");
		assert.deepEqual(parseDirectoryFilters(params), { area: "tambon-song", name: "รพ.สต." });
		assert.deepEqual(parseDirectoryFilters(new URLSearchParams()), { area: "", name: "" });
	});

	it("builds the list's address with the filters that are set", () => {
		assert.equal(directoryPath(), "/health-services");
		assert.equal(directoryPath({ area: "", name: "" }), "/health-services");
		assert.equal(directoryPath({ area: "tambon-song" }), "/health-services?area=tambon-song");
		assert.equal(
			directoryPath({ area: "tambon-song", name: "บ้าน กลาง" }),
			"/health-services?area=tambon-song&name=%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99+%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87",
		);
	});

	it("reads back the filters it wrote", () => {
		const filters = { area: "moo-1", name: "รพ.สต. & คลินิก" };
		const url = new URL(directoryPath(filters), "http://127.0.0.1:4324");
		assert.deepEqual(parseDirectoryFilters(url.searchParams), filters);
	});

	it("gives each Health Service its canonical address, /health-services/{slug}", () => {
		assert.equal(healthServicePath("rpst-ban-klang"), "/health-services/rpst-ban-klang");
		assert.equal(
			healthServicePath("บ้านกลาง"),
			"/health-services/%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87",
		);
	});
});

describe("mapHref", () => {
	it("builds a Google Maps search link from the latitude and longitude", () => {
		assert.equal(
			mapHref(18.12345, 100.12346),
			"https://www.google.com/maps/search/?api=1&query=18.12345%2C100.12346",
		);
		assert.equal(
			mapHref(-33.8568, 151.2153),
			"https://www.google.com/maps/search/?api=1&query=-33.8568%2C151.2153",
		);
	});

	it("leaves the link out unless both coordinates are numbers in range", () => {
		assert.equal(mapHref(null, 100.1), undefined);
		assert.equal(mapHref(18.1, undefined), undefined);
		assert.equal(mapHref(91, 100.1), undefined);
		assert.equal(mapHref(18.1, -180.5), undefined);
		assert.equal(mapHref(Number.NaN, 100.1), undefined);
	});

	it("accepts the equator and the prime meridian", () => {
		assert.equal(mapHref(0, 0), "https://www.google.com/maps/search/?api=1&query=0%2C0");
	});
});

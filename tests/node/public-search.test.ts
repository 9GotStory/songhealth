// Search (#63; spec #51 "Search", ADR 0002).
//
// - A query is normalised: Unicode NFC, Latin letters lower-cased, zero-width characters
//   (U+200B–U+200D, U+FEFF) removed, whitespace collapsed and trimmed. It needs at least 2
//   characters after that, else it is too short, and it is capped at 100 characters.
// - The query splits on whitespace into terms, and an entry matches when every term appears as a
//   substring of at least one of its fields, so Thai matches without word spaces.
// - Results rank by the best tier each term hits (title, then summary, then body), and a tie goes
//   to the newer entry. Each group counts its results, and a page shows a fixed number of them.
// - A result's snippet is HTML-escaped plain text: the summary, or the text around the match, cut
//   between words, with the terms marked.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	SEARCH_GROUPS,
	SEARCH_PAGE_SIZE,
	SNIPPET_LENGTH,
	parseGroup,
	parseQuery,
	searchPage,
	type SearchGroupId,
	type Searchable,
	type SearchKind,
} from "../../src/lib/search-matcher.ts";

/** A published entry as the search reads it: its kind, its text by tier, and its date. */
function entry(
	id: string,
	text: { title: string | string[]; summary?: string | string[]; body?: string | string[] },
	options: { kind?: SearchKind; date?: string | null } = {},
): Searchable & { id: string } {
	const list = (value: string | string[] | undefined) =>
		value === undefined ? [] : Array.isArray(value) ? value : [value];
	return {
		id,
		kind: options.kind ?? "news",
		title: list(text.title),
		summary: list(text.summary),
		body: list(text.body),
		date: options.date ?? null,
	};
}

/** The ids of the entries a search finds for `q`, in the order it ranks them. */
function found(
	entries: ReadonlyArray<Searchable & { id: string }>,
	q: string,
	group: SearchGroupId = "all",
): string[] {
	const query = parseQuery(q);
	assert.equal(query.kind, "terms", `"${q}" is a query`);
	if (query.kind !== "terms") return [];
	return searchPage(entries, query.terms, group, 1).results.map((result) => result.entry.id);
}

describe("parseQuery", () => {
	it("asks nothing when there is no query, or only whitespace and zero-width characters", () => {
		assert.deepEqual(parseQuery(null), { kind: "none" });
		assert.deepEqual(parseQuery(""), { kind: "none" });
		assert.deepEqual(parseQuery(" \t\u200B\uFEFF "), { kind: "none" });
	});

	it("rejects a query of one character after normalisation as too short", () => {
		assert.deepEqual(parseQuery("ก"), { kind: "too-short" });
		assert.deepEqual(parseQuery("  a  "), { kind: "too-short" });
		assert.deepEqual(
			parseQuery("ก\u200B"),
			{ kind: "too-short" },
			"a zero-width character is not one",
		);
	});

	it("accepts two characters, Thai without spaces included", () => {
		assert.deepEqual(parseQuery("ไข"), { kind: "terms", terms: ["ไข"] });
		assert.deepEqual(parseQuery("ไข้เลือดออก"), { kind: "terms", terms: ["ไข้เลือดออก"] });
	});

	it("normalises to NFC, lower-cases Latin letters, drops zero-width characters and splits on whitespace", () => {
		assert.deepEqual(parseQuery("  CAFE\u0301 \u200Bวัคซีน\uFEFF\n\tCOVID-19  "), {
			kind: "terms",
			terms: ["caf\u00E9", "วัคซีน", "covid-19"],
		});
	});

	it("keeps each term once", () => {
		assert.deepEqual(parseQuery("ข่าว ข่าว สอง"), { kind: "terms", terms: ["ข่าว", "สอง"] });
	});

	it("caps the query at 100 characters", () => {
		const long = "ก".repeat(98) + "ขค" + "งจฉ";
		assert.deepEqual(parseQuery(long), { kind: "terms", terms: ["ก".repeat(98) + "ขค"] });
		assert.deepEqual(parseQuery(`${"ก".repeat(99)} ขค`), {
			kind: "terms",
			terms: ["ก".repeat(99)],
		});
	});
});

describe("searchPage matching", () => {
	const dengue = entry("dengue", {
		title: "รณรงค์ป้องกันโรคไข้เลือดออกในชุมชน",
		summary: "อสม.ร่วมกำจัดแหล่งเพาะพันธุ์ยุงลาย",
		body: "เจ้าหน้าที่ รพ.สต.บ้านกลาง ลงพื้นที่ตำบลสอง",
	});
	const vaccine = entry("vaccine", {
		title: "Influenza Vaccine สำหรับผู้สูงอายุ",
		body: "ฉีดวัคซีนไข้หวัดใหญ่ฟรีที่โรงพยาบาลสอง",
	});
	const all = [dengue, vaccine];

	it("finds a Thai substring of a title, a summary or a body without word spaces", () => {
		assert.deepEqual(found(all, "ไข้เลือด"), ["dengue"], "part of a word in the title");
		assert.deepEqual(found(all, "เพาะพันธุ์ยุง"), ["dengue"], "in the summary");
		assert.deepEqual(found(all, "บ้านกลาง"), ["dengue"], "in the body");
		assert.deepEqual(found(all, "ไข้หวัด"), ["vaccine"]);
		assert.deepEqual(found(all, "มาลาเรีย"), []);
	});

	it("matches Latin text in any case", () => {
		assert.deepEqual(found(all, "influenza"), ["vaccine"]);
		assert.deepEqual(found(all, "VACCINE"), ["vaccine"]);
		assert.deepEqual(found(all, "vAcCiNe สูงอายุ"), ["vaccine"]);
	});

	it("matches content stored in NFD or with zero-width characters", () => {
		const stored = [
			entry("nfd", { title: "Cafe\u0301 สุขภาพ" }),
			entry("zero-width", { title: "วัค\u200Bซีน\uFEFFเด็ก" }),
		];
		assert.deepEqual(found(stored, "caf\u00E9"), ["nfd"]);
		assert.deepEqual(found(stored, "วัคซีนเด็ก"), ["zero-width"]);
	});

	it("matches an entry only when every term appears in one of its fields", () => {
		assert.deepEqual(found(all, "ไข้ สอง"), ["dengue", "vaccine"], "both have both");
		assert.deepEqual(found(all, "ไข้เลือดออก สอง"), ["dengue"], "terms in different fields");
		assert.deepEqual(found(all, "ไข้เลือดออก วัคซีน"), [], "no entry has both");
	});
});

describe("searchPage ranking", () => {
	it("ranks a title hit above a summary hit above a body hit, whatever their dates", () => {
		const entries = [
			entry(
				"body",
				{ title: "ประกาศ", body: "ตรวจคัดกรองเบาหวาน" },
				{ date: "2026-10-20T03:00:00Z" },
			),
			entry(
				"summary",
				{ title: "ข่าว", summary: "คัดกรองเบาหวาน" },
				{ date: "2026-09-01T03:00:00Z" },
			),
			entry("title", { title: "คัดกรองเบาหวานฟรี" }, { date: "2025-01-01T03:00:00Z" }),
		];
		assert.deepEqual(found(entries, "เบาหวาน"), ["title", "summary", "body"]);
	});

	it("scores each term by the best tier it hits", () => {
		const entries = [
			entry("summary-only", { title: "ข่าว", summary: "เบาหวาน ความดัน" }),
			entry("title-and-body", { title: "เบาหวาน", body: "ความดัน" }),
			entry("title-twice", { title: "เบาหวาน ความดัน", body: "เบาหวาน ความดัน" }),
		];
		assert.deepEqual(found(entries, "ความดัน เบาหวาน"), [
			"title-twice",
			"title-and-body",
			"summary-only",
		]);
	});

	it("gives a tie to the newer entry, and to the order given when neither is newer", () => {
		const entries = [
			entry("undated", { title: "วัคซีน" }),
			entry("older", { title: "วัคซีน" }, { date: "2026-01-01T03:00:00Z" }),
			entry("newer", { title: "วัคซีน" }, { date: "2026-10-01T03:00:00Z" }),
			entry("undated-too", { title: "วัคซีน" }, { date: null }),
			entry("same-day", { title: "วัคซีน" }, { date: "2026-10-01T03:00:00Z" }),
		];
		assert.deepEqual(found(entries, "วัคซีน"), [
			"newer",
			"same-day",
			"older",
			"undated",
			"undated-too",
		]);
	});
});

describe("search groups", () => {
	it("offers ทุกประเภท and the six groups of `08` §7, in order", () => {
		assert.deepEqual(
			SEARCH_GROUPS.map(({ label }) => label),
			[
				"ทุกประเภท",
				"ข่าวสาร",
				"บริการประชาชน",
				"ข้อมูลสุขภาพ",
				"หน่วยบริการ",
				"เอกสาร",
				"เกี่ยวกับเรา",
			],
		);
	});

	it("reads a known group from the address, and any other value as ทุกประเภท", () => {
		assert.equal(parseGroup("news"), "news");
		assert.equal(parseGroup("health-services"), "health-services");
		assert.equal(parseGroup(null), "all");
		assert.equal(parseGroup(""), "all");
		assert.equal(parseGroup("NEWS"), "all");
		assert.equal(parseGroup("toString"), "all");
	});

	const kinds: SearchKind[] = [
		"news",
		"activity",
		"announcement",
		"service",
		"health_service",
		"health_content",
		"health_report",
		"document",
		"page",
	];
	const everyKind = kinds.map((kind) => entry(kind, { title: `สอง ${kind}` }, { kind }));
	const groupOf = (group: SearchGroupId) => found(everyKind, "สอง", group);

	it("narrows the results to the kinds of the chosen group", () => {
		assert.deepEqual(groupOf("all"), kinds);
		assert.deepEqual(groupOf("news"), ["news", "activity", "announcement"]);
		assert.deepEqual(groupOf("services"), ["service"]);
		assert.deepEqual(groupOf("health"), ["health_content", "health_report"]);
		assert.deepEqual(groupOf("health-services"), ["health_service"]);
		assert.deepEqual(groupOf("documents"), ["document"]);
		assert.deepEqual(groupOf("about"), ["page"]);
	});

	it("counts the results of every group, whichever group is chosen", () => {
		const entries = [
			...everyKind,
			entry("more-news", { title: "สอง" }),
			entry("other", { title: "หนึ่ง" }),
		];
		const expected = {
			all: 10,
			news: 4,
			services: 1,
			health: 2,
			"health-services": 1,
			documents: 1,
			about: 1,
		};
		assert.deepEqual(searchPage(entries, ["สอง"], "all", 1).counts, expected);
		assert.deepEqual(searchPage(entries, ["สอง"], "documents", 1).counts, expected);
	});
});

describe("search pages", () => {
	const many = Array.from({ length: SEARCH_PAGE_SIZE * 2 + 1 }, (_, index) =>
		entry(
			`n${index}`,
			{ title: "วัคซีน" },
			{ date: new Date(Date.UTC(2026, 0, 100 - index)).toISOString() },
		),
	);
	const ids = (page: number) =>
		searchPage(many, ["วัคซีน"], "all", page).results.map((result) => result.entry.id);

	it("shows a fixed number of results to a page, and says whether a further page follows", () => {
		assert.equal(SEARCH_PAGE_SIZE, 20);
		assert.deepEqual(
			ids(1),
			many.slice(0, 20).map((e) => e.id),
		);
		assert.deepEqual(
			ids(2),
			many.slice(20, 40).map((e) => e.id),
		);
		assert.deepEqual(ids(3), ["n40"]);
		assert.equal(searchPage(many, ["วัคซีน"], "all", 2).hasMore, true);
		assert.equal(searchPage(many, ["วัคซีน"], "all", 3).hasMore, false);
	});

	it("shows no results on a page past the last, while still counting them", () => {
		const past = searchPage(many, ["วัคซีน"], "all", 4);
		assert.deepEqual(past.results, []);
		assert.equal(past.hasMore, false);
		assert.equal(past.counts.all, 41);
	});
});

describe("search snippets", () => {
	/** The snippet of the one entry a search for `q` finds. */
	function snippet(text: Parameters<typeof entry>[1], q: string): string {
		const query = parseQuery(q);
		assert.equal(query.kind, "terms");
		if (query.kind !== "terms") return "";
		const { results } = searchPage([entry("one", text)], query.terms, "all", 1);
		assert.equal(results.length, 1, `"${q}" finds the entry`);
		return results[0].snippet;
	}

	it("shows the summary when the title alone matches, else the start of the body, else nothing", () => {
		const title = "วัคซีนไข้หวัดใหญ่";
		assert.equal(
			snippet({ title, summary: "ฉีดฟรีสำหรับผู้สูงอายุ", body: "ที่โรงพยาบาลสอง" }, "วัคซีน"),
			"ฉีดฟรีสำหรับผู้สูงอายุ",
		);
		assert.equal(snippet({ title, body: ["", "ที่โรงพยาบาลสอง"] }, "วัคซีน"), "ที่โรงพยาบาลสอง");
		assert.equal(snippet({ title }, "วัคซีน"), "");
	});

	it("marks the terms in the summary, or in the body when only the body matches", () => {
		assert.equal(
			snippet({ title: "ข่าว", summary: "รณรงค์ป้องกันไข้เลือดออก" }, "ไข้เลือด"),
			"รณรงค์ป้องกัน<mark>ไข้เลือด</mark>ออก",
		);
		assert.equal(
			snippet({ title: "ข่าว", summary: "ประชาสัมพันธ์", body: "ลงพื้นที่บ้านกลาง" }, "บ้านกลาง"),
			"ลงพื้นที่<mark>บ้านกลาง</mark>",
		);
	});

	it("marks every term as the text writes it, in NFC with zero-width characters removed", () => {
		assert.equal(
			snippet({ title: "ข่าว", body: "Influenza  vaccine\n ฟรี" }, "VACCINE influenza"),
			"<mark>Influenza</mark> <mark>vaccine</mark> ฟรี",
		);
		assert.equal(
			snippet({ title: "ข่าว", summary: "Cafe\u0301\u200B สุขภาพ" }, "caf\u00E9"),
			"<mark>Caf\u00E9</mark> สุขภาพ",
		);
		assert.equal(
			snippet({ title: "ข่าว", summary: "ตรวจสุขภาพประจำปี" }, "สุขภาพ ขภาพประจำ"),
			"ตรวจ<mark>สุขภาพประจำ</mark>ปี",
			"overlapping terms make one mark",
		);
	});

	it("never splits a character from its vowel or tone mark", () => {
		assert.equal(
			snippet({ title: "ข่าว", summary: "ปู่ย่าตายาย" }, "ปู"),
			"<mark>ปู่</mark>ย่าตายาย",
		);
	});

	it("escapes the text as HTML, marks included", () => {
		assert.equal(
			snippet({ title: "ข่าว", summary: `<script>alert("x")</script> & 'ok'` }, "alert"),
			"&lt;script&gt;<mark>alert</mark>(&quot;x&quot;)&lt;/script&gt; &amp; &#39;ok&#39;",
		);
		assert.equal(
			snippet({ title: "ข่าว", summary: "a <b> tag" }, "<b>"),
			"a <mark>&lt;b&gt;</mark> tag",
		);
	});

	it("cuts a long text around the first match, between words, and marks the cuts", () => {
		const before =
			"สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลส่งเสริมสุขภาพตำบลจัดกิจกรรมรณรงค์".repeat(3);
		const after =
			"ผู้สนใจสามารถยื่นใบสมัครได้ที่สำนักงานในวันและเวลาราชการพร้อมสำเนาบัตรประชาชน".repeat(3);
		const body = `${before}ฉีดวัคซีนป้องกันโรคหัด${after}`;
		const cut = snippet({ title: "ข่าว", body }, "วัคซีน");
		assert.ok(cut.startsWith("…") && cut.endsWith("…"), cut);
		const kept = cut.slice(1, -1).replace(/<\/?mark>/g, "");
		assert.ok(kept.length <= SNIPPET_LENGTH, `at most ${SNIPPET_LENGTH} characters: ${cut}`);
		const start = body.indexOf(kept);
		assert.ok(start > 0, `a part of the body: ${cut}`);
		const words = [...new Intl.Segmenter("th", { granularity: "word" }).segment(body)];
		for (const at of [start, start + kept.length]) {
			assert.ok(
				words.some(({ index }) => index === at),
				`the cuts fall between words: ${cut}`,
			);
		}
		assert.ok(cut.includes("<mark>วัคซีน</mark>"), cut);
		const lead = kept.indexOf("วัคซีน");
		assert.ok(lead >= 20 && lead <= 60, `some text before the match: ${cut}`);
	});
});

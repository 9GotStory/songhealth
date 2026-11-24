// Screenshot content for Feature 015's pages (spec #432; #433's before screenshots): /search in
// each of its states, the 404 page, and the Homepage, whose hero's search pill /search and the 404
// page share, each at the five widths. CASE names one:
//
// - demo: the demo dataset's content alone, nothing made. /search's start page (search-start), a
//   query too short (search-too-short, "ก"), one that finds nothing (search-nothing), "สุขภาพ" on
//   its first and second page (search-found, search-found-page-2), in ITA, where it finds nothing
//   (search-group-empty), and on a page past the last (search-past-last), "ตัวอย่าง", which finds
//   every kind (search-kinds); the 404 page (not-found), whose miss carries the suites' synthetic
//   referrer (capture-screenshots.mjs), and the Homepage (home).
// - content: the rows the demo dataset lacks (spec #432 "Testing Decisions"), found by one made-up
//   word: a News without a summary or a body, so its result has no snippet; a News whose title is
//   175 characters, the longest title the office has published (a MOIT's, spec #392 "Measured in
//   the prototype"); and an expired Document. Captured as search-rows.
//
// Every title is made up and starts with "[ตัวอย่าง]".
//
//   CASE=demo scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
//     scripts/screenshot-fixtures/search-cases.ts <out-dir>

import type { Capture, Fixtures, FixtureKit } from "../capture-with-fixtures.ts";
import { atWidths, caseOf } from "./homepage-widths.ts";

const which = caseOf(["demo", "content"] as const);

/** The made-up word the content case's rows carry, which nothing else on the runtime holds. */
const ROWS_WORD = "แถวสาธิตผลค้นหา";

/** The longest title the office has published, in characters (spec #392). */
const PUBLISHED_TITLE_LENGTH = 175;

/** Made-up words, repeated to `length` characters after "[ตัวอย่าง] " and the rows' word. */
function longTitle(length: number): string {
	let text = `[ตัวอย่าง] ${ROWS_WORD} `;
	while (text.length < length) text += "หัวข้อข่าวสมมุติสำหรับทดสอบการตัดบรรทัดของชื่อที่ยาว ";
	return text.slice(0, length).trimEnd().padEnd(length, "ก");
}

const at = (path: string, query: Record<string, string>) => `${path}?${new URLSearchParams(query)}`;

/** The demo dataset's pages: /search in each state, the 404 page and the Homepage. */
const DEMO: Array<[name: string, path: string]> = [
	["search-start", "/search"],
	["search-too-short", at("/search", { q: "ก" })],
	["search-nothing", at("/search", { q: "zzzzqq" })],
	["search-found", at("/search", { q: "สุขภาพ" })],
	["search-found-page-2", at("/search", { q: "สุขภาพ", page: "2" })],
	["search-group-empty", at("/search", { q: "สุขภาพ", group: "ita" })],
	["search-past-last", at("/search", { q: "สุขภาพ", page: "9" })],
	["search-kinds", at("/search", { q: "ตัวอย่าง" })],
	["not-found", "/no-such-page"],
	["home", "/"],
];

/** Publish one synthetic entry of `collection` with `data`, or throw. */
async function publish(
	{ admin, helpers }: FixtureKit,
	collection: string,
	data: Record<string, unknown>,
): Promise<void> {
	const entry = await helpers.createSyntheticEntry(admin, collection, {
		slug: helpers.syntheticSlug("shot"),
		data,
	});
	if (!entry.result.ok) throw new Error(`${collection}: ${helpers.nativeRefusalOf(entry.result)}`);
	const published = await helpers.publishEntry(admin, collection, entry.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
}

const fixtures: Fixtures = async (kit) => {
	if (which === "demo") return DEMO.flatMap(([name, path]): Capture[] => atWidths(name, path));
	const file = await kit.helpers.uploadSyntheticPdf(kit.admin);
	await publish(kit, "news", { title: `[ตัวอย่าง] ${ROWS_WORD} ข่าวที่ไม่มีสรุปและเนื้อหา` });
	await publish(kit, "news", {
		title: longTitle(PUBLISHED_TITLE_LENGTH),
		summary: "สรุปข่าวสมมุติสำหรับแถวที่มีชื่อยาวที่สุด",
	});
	await publish(kit, "documents", {
		title: `[ตัวอย่าง] ${ROWS_WORD} แนวทางที่หมดอายุแล้ว`,
		summary: "เอกสารสมมุติที่หมดอายุ สำหรับแถวที่แสดงสถานะ",
		file: file.value,
		domain_status: "expired",
	});
	return atWidths("search-rows", at("/search", { q: ROWS_WORD }));
};

export default fixtures;

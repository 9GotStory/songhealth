// The migration script's plan (#177; spec #174 "The migration script", "Mapping: the news stream"
// and "Mapping: directives and procurement notices"; grill Q3, Q4, Q16 and Q24; seam A).
//
// plan reads the Legacy site's export with EmDash's WXR parser and the uploads copy's file list,
// and writes the Classification list and an inventory. The expected values come from the spec and
// the ticket: the defaults by legacy category and title word, the flags, the merge with an earlier
// list, and the outputs that carry nothing personal. Every export here is synthetic.
//
// Each synthetic export goes through EmDash's own parser, the `emdash` package's main entry, which
// plain Node loads: CODING_STANDARDS "Tests" says "no `emdash`", and the Product Owner kept the
// real parser in these tests (#177 comment 6719251511, item 1), so they see what it drops.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isInside } from "../../scripts/migration.ts";
import { readLegacySite } from "../../scripts/migration/legacy-site.ts";
import { plan, type ListRow } from "../../scripts/migration/plan.ts";
import { readZipNames } from "../../scripts/migration/zip.ts";
import {
	ACTIVITY,
	AUTHOR,
	OTHER_NEWS,
	PM25,
	PUBLIC_RELATIONS,
	SITE,
	attachment,
	newsItem,
	wxrDocument,
	zipOf,
	type SyntheticCategory,
	type SyntheticItem,
} from "./migration.helpers.ts";

const ORDER: SyntheticCategory = { domain: "category-directive", slug: "order", name: "คำสั่ง" };
const NOTICE: SyntheticCategory = { domain: "category-directive", slug: "notice", name: "ประกาศ" };

/** The procurement categories of the Legacy site: none of them changes the default. */
const WINNER: SyntheticCategory = {
	domain: "category-procurement",
	slug: "winner",
	name: "ประกาศผู้ชนะการเสนอราคา",
};
const AUCTION: SyntheticCategory = {
	domain: "category-procurement",
	slug: "auction",
	name: "ขายทอดตลาด",
};

/** The file of every synthetic directive and procurement notice, and its path in the uploads. */
const NOTICE_PATH = "wp-content/uploads/2025/03/notice.pdf";
const NOTICE_FILE = attachment(900, NOTICE_PATH);

/** A directive `directive-{id}` with one file, NOTICE_FILE. */
function directive(id: number, fields: Partial<SyntheticItem> = {}): SyntheticItem {
	return {
		type: "directive",
		id,
		slug: `directive-${id}`,
		title: `ประกาศที่ ${id}`,
		meta: { file_1: "900" },
		...fields,
	};
}

/** A procurement notice `procurement-{id}` with one file, NOTICE_FILE. */
function procurement(id: number, fields: Partial<SyntheticItem> = {}): SyntheticItem {
	return {
		type: "procurement",
		id,
		slug: `procurement-${id}`,
		title: `ประกาศผู้ชนะ ${id}`,
		meta: { file_1: "900" },
		...fields,
	};
}

/** The plan of an export holding `items`, with the uploads copy's names and an earlier list. */
async function planOf(items: SyntheticItem[], uploads: string[] = [], earlierList?: string) {
	return plan({ site: await readLegacySite(wxrDocument(items)), uploads, earlierList });
}

/** Each row's slug with the columns a test reads. */
const columns = (rows: ListRow[], ...names: (keyof ListRow)[]) =>
	rows.map((row) => [row.slug, ...names.map((name) => row[name])]);

describe("the Classification list's defaults", () => {
	it("starts a กิจกรรม item as an Activity", async () => {
		const { rows } = await planOf([newsItem(1, { categories: [ACTIVITY] })]);
		assert.deepEqual(columns(rows, "default_target", "default_type"), [["news-1", "Activity", ""]]);
	});

	it("starts ประชาสัมพันธ์, with or without PM 2.5, and an item without a category as News", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [PUBLIC_RELATIONS] }),
			newsItem(2, { categories: [PUBLIC_RELATIONS, PM25] }),
			newsItem(3, { categories: [PM25] }),
			newsItem(4),
		]);
		assert.deepEqual(columns(rows, "default_target", "default_type"), [
			["news-1", "News", ""],
			["news-2", "News", ""],
			["news-3", "News", ""],
			["news-4", "News", ""],
		]);
	});

	it("starts a กิจกรรม row whose title holds a News word as ต้องเลือก", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [ACTIVITY], title: "เชิญชวนร่วมงานวันเบาหวานโลก" }),
			newsItem(2, { categories: [ACTIVITY], title: "อำเภอสองขอเชิญประชาชนตรวจสุขภาพ" }),
			newsItem(3, { categories: [ACTIVITY], title: "ประชาสัมพันธ์การฉีดวัคซีน" }),
			newsItem(4, { categories: [ACTIVITY], title: "ประชุมเชิงปฏิบัติการ อสม." }),
			// The words point only a กิจกรรม row at a reviewer: News stays News.
			newsItem(5, { categories: [PUBLIC_RELATIONS], title: "ขอเชิญร่วมรณรงค์" }),
		]);
		assert.deepEqual(columns(rows, "default_target", "flags"), [
			["news-1", "ต้องเลือก", "title-word"],
			["news-2", "ต้องเลือก", "title-word"],
			["news-3", "ต้องเลือก", "title-word"],
			["news-4", "Activity", ""],
			["news-5", "News", ""],
		]);
	});

	it("starts an item whose categories no default names as ต้องเลือก", async () => {
		const { rows } = await planOf(
			[
				newsItem(1, { categories: [ACTIVITY, PUBLIC_RELATIONS] }),
				newsItem(2, { categories: [OTHER_NEWS] }),
				directive(3, { categories: [ORDER, NOTICE] }),
				directive(4),
				NOTICE_FILE,
			],
			[NOTICE_PATH],
		);
		assert.deepEqual(columns(rows, "default_target", "default_type", "flags"), [
			["news-1", "ต้องเลือก", "", "unmatched-categories"],
			["news-2", "ต้องเลือก", "", "unmatched-categories"],
			["directive-3", "ต้องเลือก", "", "unmatched-categories"],
			// Unlike a news item, a directive without a category has no default.
			["directive-4", "ต้องเลือก", "", "no-category"],
		]);
	});

	it("starts a directive in คำสั่ง as a Document of the type คำสั่ง (order)", async () => {
		const { rows } = await planOf([directive(1, { categories: [ORDER], title: "คำสั่งแต่งตั้ง" })]);
		assert.deepEqual(columns(rows, "default_target", "default_type"), [
			["directive-1", "Document", "order"],
		]);
	});

	it("starts a directive in ประกาศ as an Announcement, รับสมัครงาน by its title words", async () => {
		const { rows } = await planOf([
			directive(1, { categories: [NOTICE], title: "ประกาศรับสมัครพนักงานกระทรวง" }),
			directive(2, { categories: [NOTICE], title: "ประกาศสรรหาบุคคล" }),
			directive(3, { categories: [NOTICE], title: "ประกาศจ้างลูกจ้างชั่วคราว" }),
			directive(4, { categories: [NOTICE], title: "ประกาศเจตนารมณ์ต่อต้านการทุจริต" }),
		]);
		assert.deepEqual(columns(rows, "default_target", "default_type"), [
			["directive-1", "Announcement", "recruitment"],
			["directive-2", "Announcement", "recruitment"],
			["directive-3", "Announcement", "recruitment"],
			["directive-4", "Announcement", "general"],
		]);
	});

	it("starts every procurement notice as an Announcement of the type จัดซื้อจัดจ้าง", async () => {
		const { rows } = await planOf([
			procurement(1, { categories: [WINNER] }),
			procurement(2, { categories: [AUCTION], title: "ประกาศรับสมัครผู้ประมูล" }),
			procurement(3),
		]);
		assert.deepEqual(columns(rows, "default_target", "default_type"), [
			["procurement-1", "Announcement", "procurement"],
			["procurement-2", "Announcement", "procurement"],
			["procurement-3", "Announcement", "procurement"],
		]);
	});
});

describe("the Classification list's rows", () => {
	it("has a row for each published news stream item, directive and procurement notice", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [ACTIVITY] }),
			newsItem(2, { categories: [ACTIVITY], status: "draft" }),
			directive(3, { categories: [ORDER] }),
			procurement(4),
			{ type: "post", id: 5, slug: "moit-1-2569", title: "MOIT 1 การเปิดเผยข้อมูล" },
			{ type: "page", id: 6, slug: "history", title: "ประวัติ" },
			attachment(900, "wp-content/uploads/2025/03/file.pdf"),
			{ type: "nf_sub", id: 7, title: "แบบฟอร์มติดต่อ" },
		]);
		assert.deepEqual(columns(rows, "legacy_type", "wp_id"), [
			["news-1", "public-new", "1"],
			["directive-3", "directive", "3"],
			["procurement-4", "procurement", "4"],
		]);
	});

	it("lists the news stream, then directives, then procurement notices, each oldest first", async () => {
		const { rows } = await planOf([
			procurement(1, { date: "2025-01-01 03:00:00" }),
			newsItem(2, { categories: [ACTIVITY], date: "2025-05-01 03:00:00" }),
			directive(3, { categories: [ORDER], date: "2025-02-01 03:00:00" }),
			newsItem(4, { categories: [ACTIVITY], date: "2025-04-01 03:00:00" }),
			// Published in the same second as news-4: the lower WordPress ID comes first.
			newsItem(9, { categories: [ACTIVITY], date: "2025-04-01 03:00:00" }),
			newsItem(5, { categories: [ACTIVITY], date: "2025-04-01 03:00:00" }),
		]);
		assert.deepEqual(
			rows.map((row) => row.slug),
			["news-4", "news-5", "news-9", "news-2", "directive-3", "procurement-1"],
		);
	});

	it("writes the title, the Bangkok publish date and its fiscal year, which starts in October", async () => {
		const { rows } = await planOf([
			// 23:59:59 on 30 September in Bangkok (UTC+7): the last second of fiscal year 2568.
			newsItem(1, { title: "รายงานสถานการณ์ฝุ่น", date: "2025-09-30 16:59:59" }),
			// 00:00 on 1 October in Bangkok: the first second of fiscal year 2569.
			newsItem(2, { title: "ประชุมประจำเดือน", date: "2025-09-30 17:00:00" }),
		]);
		assert.deepEqual(columns(rows, "title", "published", "fiscal_year"), [
			["news-1", "รายงานสถานการณ์ฝุ่น", "2025-09-30", "2568"],
			["news-2", "ประชุมประจำเดือน", "2025-10-01", "2569"],
		]);
	});

	it("names the legacy categories, in code point order and joined by a semicolon", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [PUBLIC_RELATIONS, PM25] }),
			procurement(2, { categories: [WINNER, AUCTION] }),
			newsItem(3),
			// The parser keeps no label equal to its slug: the name is the slug as written.
			newsItem(4, {
				categories: [{ domain: "category-public-news", slug: "covid-19", name: "covid-19" }],
			}),
		]);
		assert.deepEqual(columns(rows, "categories", "default_target"), [
			["news-1", "PM 2.5; ประชาสัมพันธ์", "News"],
			["news-3", "", "News"],
			["news-4", "covid-19", "ต้องเลือก"],
			["procurement-2", "ขายทอดตลาด; ประกาศผู้ชนะการเสนอราคา", "Announcement"],
		]);
	});

	it("refuses a published item whose publish date the export gives malformed", async () => {
		await assert.rejects(
			planOf([newsItem(1, { categories: [ACTIVITY], date: "2025-02-30 25:00:00" })]),
			/news-1 has no publish date/,
		);
	});
});

describe("the Classification list's flags", () => {
	it("flags an item that carries PM 2.5", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [PUBLIC_RELATIONS, PM25] }),
			newsItem(2, { categories: [PM25] }),
			newsItem(3, { categories: [PUBLIC_RELATIONS] }),
			newsItem(4),
		]);
		assert.deepEqual(columns(rows, "flags"), [
			["news-1", "pm25"],
			["news-2", "pm25"],
			["news-3", ""],
			["news-4", "no-category"],
		]);
	});

	it("flags an item whose ACF editor or block editor holds text", async () => {
		const { rows } = await planOf([
			newsItem(1, { categories: [PM25], meta: { editor: "<h2>สถานการณ์</h2><p>ค่าฝุ่นสูง</p>" } }),
			newsItem(2, { categories: [ACTIVITY], content: "<p>ภาพกิจกรรม</p>" }),
			// Markup and white space alone hold no text.
			newsItem(3, { categories: [ACTIVITY], meta: { editor: "<p>&nbsp;</p>\n<p></p>" } }),
			newsItem(4, { categories: [ACTIVITY] }),
		]);
		assert.deepEqual(columns(rows, "flags"), [
			["news-1", "pm25 text"],
			["news-2", "text"],
			["news-3", ""],
			["news-4", ""],
		]);
	});

	it("flags a directive or procurement notice that names no file", async () => {
		const { rows } = await planOf(
			[
				directive(1, { categories: [ORDER] }),
				directive(2, { categories: [ORDER], meta: {} }),
				procurement(3, { meta: { file_1: "" } }),
				newsItem(4, { categories: [ACTIVITY] }),
				NOTICE_FILE,
			],
			[NOTICE_PATH],
		);
		assert.deepEqual(columns(rows, "flags"), [
			["news-4", ""],
			["directive-1", ""],
			["directive-2", "no-file"],
			// Without a category, a procurement notice keeps its default, and says so.
			["procurement-3", "no-category no-file"],
		]);
	});

	it("flags an item that uses a file the uploads copy lacks or the export does not list", async () => {
		const { rows } = await planOf(
			[
				attachment(101, "wp-content/uploads/2025/03/one-page.webp"),
				attachment(102, "wp-content/uploads/2025/03/missing.webp"),
				attachment(103, "wp-content/uploads/2025/03/report.pdf"),
				newsItem(1, { categories: [ACTIVITY], meta: { _thumbnail_id: "101" } }),
				newsItem(2, { categories: [ACTIVITY], meta: { _thumbnail_id: "101", image_2: "102" } }),
				// An ID the export lists no attachment for.
				newsItem(3, { categories: [ACTIVITY], meta: { _thumbnail_id: "104" } }),
				newsItem(4, {
					categories: [PM25],
					meta: {
						editor: `<p><a href="${SITE}/wp-content/uploads/2025/03/report.pdf">รายงาน</a></p>`,
					},
				}),
				// Links into the uploads that no attachment of the export has: the file is still in
				// the copy, then it is not.
				newsItem(5, {
					categories: [PM25],
					meta: { editor: '<p><a href="/wp-content/uploads/2025/03/other.pdf">รายงาน</a></p>' },
				}),
				newsItem(6, {
					categories: [PM25],
					meta: { editor: '<p><a href="/wp-content/uploads/2025/03/gone.pdf">รายงาน</a></p>' },
				}),
				directive(7, { categories: [ORDER], meta: { file_1: "103" } }),
			],
			[
				"wp-content/uploads/2025/03/",
				"wp-content/uploads/2025/03/one-page.webp",
				"wp-content/uploads/2025/03/report.pdf",
				"wp-content/uploads/2025/03/other.pdf",
			],
		);
		assert.deepEqual(columns(rows, "flags"), [
			["news-1", ""],
			["news-2", "missing-file"],
			["news-3", "missing-file"],
			["news-4", "pm25 text"],
			["news-5", "pm25 text"],
			["news-6", "pm25 text missing-file"],
			["directive-7", ""],
		]);
	});
});

/** The list's header, as the script's header documents its columns. */
const HEADER =
	"legacy_type,slug,wp_id,title,published,fiscal_year,categories,flags,default_target,default_type,decision,decision_type,summary";

describe("the Classification list's file", () => {
	it("is UTF-8 CSV with a byte order mark, the header, and a CRLF after each row", async () => {
		const { list } = await planOf([
			newsItem(1, { categories: [ACTIVITY], title: "ประชุม อสม.", date: "2025-03-14 03:00:00" }),
		]);
		assert.equal(list.charCodeAt(0), 0xfeff);
		assert.equal(
			list.slice(1),
			`${HEADER}\r\npublic-new,news-1,1,ประชุม อสม.,2025-03-14,2568,กิจกรรม,,Activity,,,,\r\n`,
		);
	});

	it("quotes a cell that holds a comma, a double quote or a line break", async () => {
		const { rows, list } = await planOf([
			newsItem(1, { categories: [ACTIVITY], title: 'ประชุม "อสม." ครั้งที่ 1, 2568' }),
		]);
		assert.equal(rows[0]!.title, 'ประชุม "อสม." ครั้งที่ 1, 2568');
		assert.match(list, /,"ประชุม ""อสม\.""\ ครั้งที่ 1, 2568",/);
	});
});

/** An earlier list as a reviewer's spreadsheet saves it: LF line endings and no byte order mark. */
const earlierList = (...rows: string[]) => [HEADER, ...rows].join("\n") + "\n";

describe("plan's merge with an earlier list", () => {
	it("keeps each row's decision, type decision and Summary, and refreshes the rest", async () => {
		const earlier = earlierList(
			"public-new,news-1,1,ชื่อที่ผู้ตรวจแก้,2025-01-01,2568,กิจกรรม,,Activity,,News,,สรุปข่าว",
			'directive,directive-2,2,ประกาศเดิม,2025-01-01,2568,ประกาศ,,Announcement,general,,recruitment,""',
		);
		const { rows } = await planOf(
			[
				newsItem(1, { categories: [ACTIVITY], title: "เชิญชวนร่วมงาน" }),
				directive(2, { categories: [NOTICE], title: "ประกาศเจตนารมณ์" }),
				NOTICE_FILE,
			],
			[NOTICE_PATH],
			earlier,
		);
		assert.deepEqual(
			columns(rows, "title", "flags", "default_target", "decision", "decision_type", "summary"),
			[
				["news-1", "เชิญชวนร่วมงาน", "title-word", "ต้องเลือก", "News", "", "สรุปข่าว"],
				["directive-2", "ประกาศเจตนารมณ์", "", "Announcement", "", "recruitment", ""],
			],
		);
	});

	it("keeps the earlier rows' order and appends only new items, with their defaults", async () => {
		const earlier = earlierList(
			"public-new,news-3,3,,2025-03-01,2568,กิจกรรม,,Activity,,,,",
			"public-new,news-1,1,,2025-01-01,2568,กิจกรรม,,Activity,,,,",
		);
		const { rows, inventory } = await planOf(
			[
				newsItem(1, { categories: [ACTIVITY] }),
				newsItem(2, { categories: [ACTIVITY] }),
				newsItem(3, { categories: [ACTIVITY] }),
				newsItem(4, { categories: [PUBLIC_RELATIONS] }),
			],
			[],
			earlier,
		);
		assert.deepEqual(columns(rows, "default_target", "decision"), [
			["news-3", "Activity", ""],
			["news-1", "Activity", ""],
			["news-2", "Activity", ""],
			["news-4", "News", ""],
		]);
		assert.deepEqual(inventory.list.added, ["news-2", "news-4"]);
	});

	it("keeps a row whose item the export no longer holds, flags it and reports it", async () => {
		const earlier = earlierList(
			"public-new,news-1,1,เรื่องที่ 1,2025-01-01,2568,กิจกรรม,,Activity,,,,",
			"public-new,news-2,2,เรื่องที่ถูกลบ,2025-01-02,2568,กิจกรรม,,ต้องเลือก,,News,,สรุปที่เขียนไว้",
		);
		const { rows, inventory } = await planOf(
			[newsItem(1, { categories: [ACTIVITY] })],
			[],
			earlier,
		);
		assert.deepEqual(columns(rows, "title", "flags", "decision", "summary"), [
			["news-1", "เรื่องที่ 1", "", "", ""],
			["news-2", "เรื่องที่ถูกลบ", "not-in-export", "News", "สรุปที่เขียนไว้"],
		]);
		assert.deepEqual(inventory.list.vanished, ["news-2"]);
		assert.deepEqual(inventory.list.toChoose, []);
	});

	it("reports the rows still ต้องเลือก and the decisions it cannot read", async () => {
		const earlier = earlierList(
			"public-new,news-1,1,,2025-01-01,2568,กิจกรรม,title-word,ต้องเลือก,,,,",
			"public-new,news-2,2,,2025-01-01,2568,กิจกรรม,title-word,ต้องเลือก,,News,,",
			"public-new,news-3,3,,2025-01-01,2568,กิจกรรม,,Activity,,ต้องเลือก,,",
			"public-new,news-4,4,,2025-01-01,2568,กิจกรรม,,Activity,,Activty,,",
			"public-new,news-5,5,,2025-01-01,2568,กิจกรรม,,Activity,,Announcement,,",
			"public-new,news-6,6,,2025-01-01,2568,กิจกรรม,,Activity,, news ,,",
			"directive,directive-7,7,,2025-01-01,2568,คำสั่ง,,Document,order,Announcement,general,",
		);
		const { inventory } = await planOf(
			[
				newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" }),
				newsItem(2, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" }),
				newsItem(3, { categories: [ACTIVITY] }),
				newsItem(4, { categories: [ACTIVITY] }),
				newsItem(5, { categories: [ACTIVITY] }),
				newsItem(6, { categories: [ACTIVITY] }),
				directive(7, { categories: [ORDER] }),
				NOTICE_FILE,
			],
			[NOTICE_PATH],
			earlier,
		);
		// A decision plan cannot read leaves its row undecided too.
		assert.deepEqual(inventory.list.toChoose, ["news-1", "news-3", "news-4", "news-5"]);
		assert.deepEqual(inventory.list.unreadable, [
			{ slug: "news-4", decision: "Activty" },
			{ slug: "news-5", decision: "Announcement" },
		]);
		assert.deepEqual(inventory.list.targets, {
			News: 2,
			Activity: 0,
			Announcement: 1,
			Document: 0,
			ต้องเลือก: 4,
		});
	});

	it("counts the Announcements and Documents by type, a changed target dropping its default type", async () => {
		const earlier = earlierList(
			// An order made an Announcement takes no type from its default, order.
			"directive,directive-1,1,,2025-01-01,2568,คำสั่ง,,Document,order,Announcement,,",
			// A notice made a Document carries no type: only an order does (spec #174).
			"directive,directive-2,2,,2025-01-01,2568,ประกาศ,,Announcement,general,Document,,",
			"directive,directive-3,3,,2025-01-01,2568,ประกาศ,,Announcement,recruitment,,general,",
			// The default target in another case keeps the default type.
			"procurement,procurement-4,4,,2025-01-01,2568,,,Announcement,procurement, announcement ,,",
			"directive,directive-5,5,,2025-01-01,2568,คำสั่ง,,Document,order,Announcement,recruitment,",
			"directive,directive-6,6,,2025-01-01,2568,คำสั่ง,,Document,order,,,",
		);
		const { inventory } = await planOf(
			[
				directive(1, { categories: [ORDER] }),
				directive(2, { categories: [NOTICE] }),
				directive(3, { categories: [NOTICE], title: "ประกาศรับสมัครพนักงาน" }),
				procurement(4),
				directive(5, { categories: [ORDER] }),
				directive(6, { categories: [ORDER] }),
				NOTICE_FILE,
			],
			[NOTICE_PATH],
			earlier,
		);
		assert.deepEqual(inventory.list.types, {
			Announcement: { general: 1, procurement: 1, recruitment: 1 },
			Document: { order: 1 },
		});
		assert.equal(inventory.list.targets.Announcement, 4);
		assert.equal(inventory.list.targets.Document, 2);
		// Every Announcement takes a type from the list (#179): plan names the one that has none.
		assert.deepEqual(inventory.list.untyped, ["directive-1"]);
	});

	it("keeps the columns reviewers added, after the list's own", async () => {
		const earlier = [
			`${HEADER},หมายเหตุ`,
			"public-new,news-1,1,,2025-01-01,2568,กิจกรรม,,Activity,,,,,ตรวจแล้ว",
		].join("\n");
		const { rows, list } = await planOf(
			[newsItem(1, { categories: [ACTIVITY] }), newsItem(2, { categories: [ACTIVITY] })],
			[],
			earlier,
		);
		assert.deepEqual(columns(rows, "หมายเหตุ"), [
			["news-1", "ตรวจแล้ว"],
			["news-2", ""],
		]);
		assert.ok(list.slice(1).startsWith(`${HEADER},หมายเหตุ\r\n`));
	});

	it("reads a list a spreadsheet saved with a byte order mark, CRLF and quoted line breaks", async () => {
		const earlier = `${String.fromCharCode(0xfeff)}${HEADER}\r\npublic-new,news-1,1,,2025-01-01,2568,กิจกรรม,,Activity,,,,"บรรทัดแรก\r\nบรรทัดที่ ""สอง"""\r\n`;
		const { rows } = await planOf([newsItem(1, { categories: [ACTIVITY] })], [], earlier);
		assert.equal(rows[0]!.summary, 'บรรทัดแรก\r\nบรรทัดที่ "สอง"');
	});

	it("refuses an earlier list that lacks a column, or holds a WordPress ID twice", async () => {
		const items = [newsItem(1, { categories: [ACTIVITY] })];
		await assert.rejects(
			planOf(items, [], "legacy_type,slug,wp_id,decision\npublic-new,news-1,1,News\n"),
			/the earlier list has no column title, published, .*summary/,
		);
		await assert.rejects(
			planOf(
				items,
				[],
				earlierList(
					"public-new,news-1,1,,2025-01-01,2568,กิจกรรม,,Activity,,News,,",
					"public-new,news-1,1,,2025-01-01,2568,กิจกรรม,,Activity,,Activity,,",
				),
			),
			/the earlier list holds WordPress ID 1 twice/,
		);
	});
});

describe("plan's inventory", () => {
	it("counts the items of the types it reads by status, and the pages", async () => {
		const { inventory } = await planOf([
			newsItem(1, { categories: [ACTIVITY] }),
			newsItem(2, { categories: [ACTIVITY] }),
			newsItem(3, { categories: [ACTIVITY], status: "draft" }),
			{ type: "post", id: 4, slug: "moit-1-2569" },
			directive(5, { categories: [ORDER] }),
			{ type: "page", id: 6, slug: "history" },
			{ type: "page", id: 7, slug: "", status: "draft" },
			{ type: "elementor_library", id: 8, slug: "template" },
		]);
		assert.deepEqual(inventory.items, {
			"public-new": { publish: 2, draft: 1 },
			post: { publish: 1 },
			directive: { publish: 1 },
			procurement: {},
			page: { publish: 1, draft: 1 },
		});
	});

	it("counts each type's published items by their categories", async () => {
		const ITA: SyntheticCategory = { domain: "category", slug: "ita", name: "ITA" };
		const { inventory } = await planOf([
			newsItem(1, { categories: [ACTIVITY] }),
			newsItem(2, { categories: [ACTIVITY] }),
			newsItem(3, { categories: [PM25, PUBLIC_RELATIONS] }),
			newsItem(4),
			newsItem(5, { categories: [PUBLIC_RELATIONS], status: "draft" }),
			{ type: "post", id: 6, slug: "moit-1-2569", categories: [ITA] },
			directive(7, { categories: [NOTICE] }),
			procurement(8, { categories: [WINNER] }),
		]);
		assert.deepEqual(inventory.categories, {
			"public-new": { กิจกรรม: 2, "PM 2.5; ประชาสัมพันธ์": 1, "(none)": 1 },
			post: { ITA: 1 },
			directive: { ประกาศ: 1 },
			procurement: { ประกาศผู้ชนะการเสนอราคา: 1 },
		});
	});

	it("counts the attachments published items use, by type, and the others by extension", async () => {
		const { inventory } = await planOf([
			attachment(101, "wp-content/uploads/2025/03/one-page.webp"),
			attachment(102, "wp-content/uploads/2025/03/photo.webp"),
			attachment(103, "wp-content/uploads/2025/03/order.pdf"),
			attachment(104, "wp-content/uploads/2024/11/ita-plan.pdf"),
			attachment(105, "wp-content/uploads/2024/11/แผนปฏิบัติการ.pdf"),
			attachment(106, "wp-content/uploads/2024/11/unused.pdf"),
			attachment(107, "wp-content/uploads/2025/01/unused.webp"),
			attachment(108, "wp-content/uploads/2025/01/draft-only.webp"),
			newsItem(1, {
				categories: [ACTIVITY],
				meta: { _thumbnail_id: "101", image_1: "101", image_2: "102" },
			}),
			newsItem(2, { categories: [ACTIVITY], meta: { _thumbnail_id: "108" }, status: "draft" }),
			directive(3, { categories: [ORDER], meta: { _thumbnail_id: "101", file_1: "103" } }),
			{
				type: "post",
				id: 4,
				slug: "moit-1-2568",
				// Root-relative, absolute and percent-encoded links into the uploads, and others.
				content: [
					'<a href="/wp-content/uploads/2024/11/ita-plan.pdf">แผน</a>',
					`<a href="${SITE}/wp-content/uploads/2024/11/${encodeURIComponent("แผนปฏิบัติการ")}.pdf">แผน</a>`,
					'<a href="/officer/">บุคลากร</a>',
					'<a href="https://www.moph.go.th/wp-content/uploads/2024/11/unused.pdf">อื่น</a>',
				].join("\n"),
			},
		]);
		assert.deepEqual(inventory.attachments, {
			total: 8,
			used: 5,
			usedBy: { "public-new": 2, post: 2, directive: 2, procurement: 0 },
			unused: 3,
			unusedByExtension: { pdf: 1, webp: 2 },
		});
	});

	it("lists the used files the uploads copy lacks and the upload links that name no attachment", async () => {
		const { inventory } = await planOf(
			[
				attachment(101, "wp-content/uploads/2025/03/one-page.webp"),
				attachment(102, "wp-content/uploads/2024/11/missing.pdf"),
				newsItem(1, { categories: [ACTIVITY], meta: { _thumbnail_id: "101" } }),
				newsItem(2, { categories: [ACTIVITY], meta: { _thumbnail_id: "109" } }),
				{
					type: "post",
					id: 3,
					slug: "moit-2-2568",
					content: [
						'<a href="/wp-content/uploads/2024/11/missing.pdf">ไฟล์</a>',
						'<a href="/wp-content/uploads/2024/11/no-record.pdf">ไฟล์</a>',
						// Without /wp-content, as legacy-ita.md defect 3 has it.
						'<a href="/uploads/2024/11/one-page.webp">ไฟล์</a>',
					].join("\n"),
				},
				{
					type: "post",
					id: 4,
					slug: "moit-3-2568",
					content: '<a href="/wp-content/uploads/2024/11/missing.pdf">ไฟล์</a>',
				},
			],
			["wp-content/uploads/2025/03/one-page.webp", "wp-content/uploads/2024/11/no-record.pdf"],
		);
		assert.deepEqual(inventory.missing, [
			{
				id: 102,
				path: "wp-content/uploads/2024/11/missing.pdf",
				usedBy: ["moit-2-2568", "moit-3-2568"],
			},
			{ id: 109, usedBy: ["news-2"] },
		]);
		assert.deepEqual(inventory.unlistedLinks, [
			{ item: "moit-2-2568", href: "/wp-content/uploads/2024/11/no-record.pdf", inUploads: true },
			{ item: "moit-2-2568", href: "/uploads/2024/11/one-page.webp", inUploads: false },
		]);
	});

	it("counts the uploads copy's entries and the files under wp-content/uploads", async () => {
		const { inventory } = await planOf(
			[],
			[
				"wp-content/",
				"wp-content/uploads/",
				"wp-content/uploads/2025/03/a.webp",
				"wp-content/uploads/forminator/b.pdf",
				"wp-content/plugins/plugin.php",
			],
		);
		assert.deepEqual(inventory.uploads, { entries: 5, files: 2 });
	});
});

describe("plan's outputs and personal data", () => {
	it("carries no author, no item's author and nothing of another type or of a draft", async () => {
		const items: SyntheticItem[] = [
			newsItem(1, {
				categories: [PM25],
				meta: { editor: "<p>ค่าฝุ่นสูง</p>" },
			}),
			newsItem(2, { categories: [ACTIVITY], title: "ร่างที่ยังไม่เผยแพร่", status: "draft" }),
			directive(3, { categories: [ORDER] }),
			NOTICE_FILE,
			{
				type: "nf_sub",
				id: 4,
				title: "ส่งข้อความติดต่อ",
				meta: {
					_field_1: "สมชาย ใจดีสังเคราะห์",
					_field_2: "081-234-5678",
					_field_3: "somchai@example.org",
				},
			},
			{ type: "elementor_library", id: 5, title: "แม่แบบหน้าแรกสังเคราะห์" },
		];
		const { list, inventory } = await planOf(items, [NOTICE_PATH]);
		const outputs = `${list}\n${JSON.stringify(inventory)}`;
		for (const personal of [
			AUTHOR.login,
			AUTHOR.email,
			AUTHOR.displayName,
			"สมชาย ใจดีสังเคราะห์",
			"081-234-5678",
			"somchai@example.org",
			"ส่งข้อความติดต่อ",
			"แม่แบบหน้าแรกสังเคราะห์",
			"ร่างที่ยังไม่เผยแพร่",
		]) {
			assert.ok(!outputs.includes(personal), `an output carries ${personal}`);
		}
		assert.ok(list.includes("news-1") && list.includes("directive-3"));
	});
});

describe("the planner's imports", () => {
	it("imports nothing at run time, which the Product Owner's seam decision rests on", async () => {
		const source = await readFile(
			new URL("../../scripts/migration/plan.ts", import.meta.url),
			"utf8",
		);
		const imports = source.split("\n").filter((line) => /^import\s/.test(line));
		assert.ok(imports.length > 0, "the planner's imports were not found");
		assert.deepEqual(
			imports.filter((line) => !/^import type\s/.test(line)),
			[],
		);
	});
});

describe("the uploads copy's file list", () => {
	it("names every entry, folders included, reading each name as UTF-8 with or without the flag", async () => {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
		try {
			const cut = Buffer.from("wp-content/uploads/2024/11/แผนงาน", "utf8");
			const zip = join(folder, "wp-content.zip");
			await writeFile(
				zip,
				zipOf([
					"wp-content/uploads/",
					"wp-content/uploads/2024/11/แผนปฏิบัติการ.pdf",
					new TextEncoder().encode("wp-content/uploads/2024/11/plan.pdf"),
					new TextEncoder().encode("wp-content/uploads/2024/11/รายงาน.pdf"),
					// A name cut one byte short of its last character, as a 255-byte file name limit cuts.
					cut.subarray(0, cut.length - 1),
				]),
			);
			assert.deepEqual(await readZipNames(zip), [
				"wp-content/uploads/",
				"wp-content/uploads/2024/11/แผนปฏิบัติการ.pdf",
				"wp-content/uploads/2024/11/plan.pdf",
				"wp-content/uploads/2024/11/รายงาน.pdf",
				`wp-content/uploads/2024/11/แผนงา${String.fromCharCode(0xfffd)}`,
			]);
			await writeFile(join(folder, "export.xml"), wxrDocument([]));
			await assert.rejects(readZipNames(join(folder, "export.xml")), /is not a zip/);
		} finally {
			await rm(folder, { recursive: true });
		}
	});
});

describe("the plan command", () => {
	const script = fileURLToPath(new URL("../../scripts/migration.ts", import.meta.url));
	const run = (...args: string[]) =>
		spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
	const sha256 = async (path: string) =>
		createHash("sha256")
			.update(await readFile(path))
			.digest("hex");

	it("writes the list and the inventory beside the export, and merges with the list there", async () => {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
		try {
			const exportPath = join(folder, "export.xml");
			const zipPath = join(folder, "wp-content.zip");
			const listPath = join(folder, "classification-list.csv");
			await writeFile(
				exportPath,
				wxrDocument([
					newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงานวันเบาหวานโลก" }),
					directive(2, { categories: [ORDER] }),
					NOTICE_FILE,
				]),
			);
			await writeFile(zipPath, zipOf([NOTICE_PATH]));
			const first = run("plan", exportPath, zipPath);
			assert.equal(first.status, 0, first.stderr);
			assert.match(first.stdout, /Rows still "ต้องเลือก": 1: news-1\n/);
			// A reviewer decides the row and writes its Summary.
			const list = await readFile(listPath, "utf8");
			await writeFile(
				listPath,
				list.replace(",ต้องเลือก,,,,\r\n", ",ต้องเลือก,,News,,สรุปข่าว\r\n"),
			);
			const second = run("plan", exportPath, zipPath);
			assert.equal(second.status, 0, second.stderr);
			assert.match(second.stdout, /Rows still "ต้องเลือก": none\n/);
			assert.match(await readFile(listPath, "utf8"), /,ต้องเลือก,,News,,สรุปข่าว\r\n/);
			const inventory = JSON.parse(await readFile(join(folder, "inventory.json"), "utf8"));
			assert.deepEqual(inventory.export, { file: "export.xml", sha256: await sha256(exportPath) });
			assert.equal(inventory.uploads.sha256, await sha256(zipPath));
			assert.deepEqual((await readdir(folder)).toSorted(), [
				"classification-list.csv",
				"export.xml",
				"inventory.json",
				"wp-content.zip",
			]);
		} finally {
			await rm(folder, { recursive: true });
		}
	});

	it("refuses an earlier list that is not UTF-8, and writes nothing", async () => {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
		try {
			const exportPath = join(folder, "export.xml");
			const zipPath = join(folder, "wp-content.zip");
			const listPath = join(folder, "classification-list.csv");
			await writeFile(exportPath, wxrDocument([newsItem(1, { categories: [ACTIVITY] })]));
			await writeFile(zipPath, zipOf([]));
			// "สรุป" in TIS-620, as Excel's plain CSV saves Thai on a Thai Windows.
			const tis620 = Buffer.from([0xca, 0xc3, 0xd8, 0xbb]);
			const list = Buffer.concat([
				Buffer.from(`${HEADER}\npublic-new,news-1,1,,2025-03-14,2568,กิจกรรม,,Activity,,,,`),
				tis620,
				Buffer.from("\n"),
			]);
			await writeFile(listPath, list);
			const result = run("plan", exportPath, zipPath);
			assert.equal(result.status, 1);
			assert.match(result.stderr, /the earlier list is not UTF-8/);
			assert.deepEqual(await readFile(listPath), list);
			assert.deepEqual((await readdir(folder)).toSorted(), [
				"classification-list.csv",
				"export.xml",
				"wp-content.zip",
			]);
		} finally {
			await rm(folder, { recursive: true });
		}
	});

	it("refuses an export inside the repository before it reads anything", () => {
		const inside = fileURLToPath(new URL("./no-such-export.xml", import.meta.url));
		const result = run("plan", inside, "no-such-copy.zip");
		assert.equal(result.status, 2);
		assert.match(result.stderr, /is inside the repository/);
	});

	it("tells a folder inside another from one whose name only starts the same", () => {
		assert.ok(isInside("/home/staff/songhealth/exports", "/home/staff/songhealth"));
		assert.ok(isInside("/home/staff/songhealth", "/home/staff/songhealth"));
		assert.ok(isInside("/home/staff/songhealth/..exports", "/home/staff/songhealth"));
		assert.ok(!isInside("/home/staff/songhealth-migration", "/home/staff/songhealth"));
		assert.ok(!isInside("/home/staff", "/home/staff/songhealth"));
	});
});

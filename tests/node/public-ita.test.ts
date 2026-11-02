// A MOIT's Evidence as its page shows it (#123; spec #121 "Content model" (the grouping rule) and
// "Public routes", ADR 0006).
//
// - A Requirement block opens a group, and the Evidence blocks that follow belong to it, in block
//   order. A Requirement whose number has a dot is a sub-Requirement of the last Requirement
//   without one, or a card of its own while there is none. Evidence before any Requirement comes
//   first, ungrouped. A block of another type is left out. The grouping reads no file.
// - A pill names its Round unless it is ไม่ระบุรอบ. A file that can be served is offered for
//   download with its type and size, and one that cannot is marked unavailable. A link leads to a
//   page of this site, to another website, or to an email or phone address, and one the page
//   cannot open safely shows its label alone.
// - The MOIT's Evidence, each card's and the files that cannot be served are counted.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	groupEvidence,
	moitEvidence,
	moitLabel,
	moitPath,
	type EvidenceBlock,
} from "../../src/lib/ita.ts";
import type { DownloadableFile } from "../../src/lib/media.ts";

/** The site's own origin, as the page passes its request's. */
const SITE = "https://songhealth.example";

function requirement(number: string, title: string): EvidenceBlock {
	return { _type: "ita_requirement", number, title };
}

/** A file block whose file is stored under `storageKey`. */
function file(label: string, storageKey: string, fields: Record<string, unknown> = {}) {
	return {
		_type: "ita_file",
		label,
		file: { id: storageKey, provider: "local", filename: storageKey, meta: { storageKey } },
		round: "ไม่ระบุรอบ",
		...fields,
	} as EvidenceBlock;
}

function link(label: string, url: string, fields: Record<string, unknown> = {}) {
	return { _type: "ita_link", label, url, round: "ไม่ระบุรอบ", ...fields } as EvidenceBlock;
}

/** The media library's files that can be served, by storage key, as downloadableFile reads them. */
const LIBRARY = new Map<string, DownloadableFile>([
	[
		"memo.pdf",
		{ href: "/_emdash/api/media/file/memo.pdf", label: "PDF, 245 KB", filename: "memo.pdf" },
	],
	[
		"form.pdf",
		{ href: "/_emdash/api/media/file/form.pdf", label: "PDF, 2 KB", filename: "form.pdf" },
	],
]);

/** The page's options, with a file read that finds only the LIBRARY's files. */
const OPTIONS = {
	siteOrigin: SITE,
	readFile: async (value: { meta?: { storageKey?: unknown } } | null | undefined) =>
		LIBRARY.get(String(value?.meta?.storageKey)),
};

/** Each card's Requirement, with its own Evidence labels and each sub-Requirement's. */
function outline(blocks: EvidenceBlock[]) {
	return groupEvidence(blocks).cards.map((card) => ({
		requirement: `${card.number} ${card.title}`,
		evidence: card.evidence.map((piece) => piece.label),
		subRequirements: card.subRequirements.map((sub) => ({
			requirement: `${sub.number} ${sub.title}`,
			evidence: sub.evidence.map((piece) => piece.label),
		})),
	}));
}

/** The pills of a MOIT whose blocks are all Evidence, which come first, ungrouped. */
async function pillsOf(blocks: EvidenceBlock[]) {
	return (await moitEvidence(blocks, OPTIONS)).lead;
}

describe("groupEvidence", () => {
	it("groups the Evidence blocks that follow a Requirement block under it, in block order", () => {
		assert.deepEqual(
			outline([
				requirement("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
				file("1.1 บันทึกข้อความเสนอ ผบห.", "memo.pdf"),
				link("1.2 ข้อมูลผู้บริหาร", "/about/leadership"),
				requirement("2", "รายงานการกำกับติดตาม"),
				file("2.1 ฟอร์มเผยแพร่", "form.pdf"),
			]),
			[
				{
					requirement: "1 คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง",
					evidence: ["1.1 บันทึกข้อความเสนอ ผบห.", "1.2 ข้อมูลผู้บริหาร"],
					subRequirements: [],
				},
				{
					requirement: "2 รายงานการกำกับติดตาม",
					evidence: ["2.1 ฟอร์มเผยแพร่"],
					subRequirements: [],
				},
			],
		);
	});

	it("puts a Requirement whose number has a dot, two dots included, in the card of the last Requirement without one", () => {
		assert.deepEqual(
			outline([
				requirement("6", "ยุทธศาสตร์ชาติ จำนวน 3 ระดับ"),
				file("6.1 แผนระดับที่ 1", "memo.pdf"),
				requirement("6.2", "แผนระดับที่ 2"),
				file("แผนแม่บทภายใต้ยุทธศาสตร์ชาติ", "memo.pdf"),
				requirement("6.2.1", "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ"),
				link("แผนพัฒนาฯ ฉบับที่ 13", "https://www.nesdc.go.th/"),
				requirement("7", "แผนปฏิบัติราชการ"),
				requirement("7.1", "แผนปฏิบัติราชการด้านการป้องกันการทุจริต"),
				file("7.1 แผนปฏิบัติราชการ ระยะที่ 2", "form.pdf"),
			]),
			[
				{
					requirement: "6 ยุทธศาสตร์ชาติ จำนวน 3 ระดับ",
					evidence: ["6.1 แผนระดับที่ 1"],
					subRequirements: [
						{ requirement: "6.2 แผนระดับที่ 2", evidence: ["แผนแม่บทภายใต้ยุทธศาสตร์ชาติ"] },
						{
							requirement: "6.2.1 แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ",
							evidence: ["แผนพัฒนาฯ ฉบับที่ 13"],
						},
					],
				},
				{
					requirement: "7 แผนปฏิบัติราชการ",
					evidence: [],
					subRequirements: [
						{
							requirement: "7.1 แผนปฏิบัติราชการด้านการป้องกันการทุจริต",
							evidence: ["7.1 แผนปฏิบัติราชการ ระยะที่ 2"],
						},
					],
				},
			],
		);
	});

	it("shows the Evidence before any Requirement first, ungrouped, and keeps a Requirement without Evidence", () => {
		const blocks = [
			file("คู่มือการประเมิน ITA", "memo.pdf"),
			link("เว็บไซต์ ITA ของกระทรวง", "https://ita.moph.go.th/"),
			requirement("1", "ข้อมูลพื้นฐาน"),
			requirement("2", "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"),
			file("วิสัยทัศน์ พันธกิจ ค่านิยม MOPH", "form.pdf"),
			requirement("3", "ข้อที่ยังไม่มีหลักฐาน"),
		];

		assert.deepEqual(
			groupEvidence(blocks).lead.map((piece) => piece.label),
			["คู่มือการประเมิน ITA", "เว็บไซต์ ITA ของกระทรวง"],
		);
		assert.deepEqual(outline(blocks), [
			{ requirement: "1 ข้อมูลพื้นฐาน", evidence: [], subRequirements: [] },
			{
				requirement: "2 วิสัยทัศน์ พันธกิจ ค่านิยม MOPH",
				evidence: ["วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"],
				subRequirements: [],
			},
			{ requirement: "3 ข้อที่ยังไม่มีหลักฐาน", evidence: [], subRequirements: [] },
		]);
	});

	it("shows each sub-Requirement that no Requirement without a dot comes before as a card of its own", () => {
		assert.deepEqual(
			outline([
				requirement("1.1", "ข้อย่อยแรกที่มาก่อนข้อหลัก"),
				file("หลักฐานของข้อ 1.1", "memo.pdf"),
				requirement("1.2", "ข้อย่อยที่สองที่มาก่อนข้อหลัก"),
				requirement("2", "ข้อหลัก"),
				requirement("2.1", "ข้อย่อยของข้อหลัก"),
			]),
			[
				{
					requirement: "1.1 ข้อย่อยแรกที่มาก่อนข้อหลัก",
					evidence: ["หลักฐานของข้อ 1.1"],
					subRequirements: [],
				},
				{ requirement: "1.2 ข้อย่อยที่สองที่มาก่อนข้อหลัก", evidence: [], subRequirements: [] },
				{
					requirement: "2 ข้อหลัก",
					evidence: [],
					subRequirements: [{ requirement: "2.1 ข้อย่อยของข้อหลัก", evidence: [] }],
				},
			],
		);
	});

	it("reads a number's trailing dot and spaces as punctuation, as the manual writes 1.", () => {
		assert.deepEqual(
			outline([
				requirement("1.", "ข้อมูลพื้นฐาน"),
				requirement(" 1.1. ", "ข้อมูลผู้บริหาร"),
				requirement(" 2 ", "วิสัยทัศน์"),
			]),
			[
				{
					requirement: "1 ข้อมูลพื้นฐาน",
					evidence: [],
					subRequirements: [{ requirement: "1.1 ข้อมูลผู้บริหาร", evidence: [] }],
				},
				{ requirement: "2 วิสัยทัศน์", evidence: [], subRequirements: [] },
			],
		);
	});

	it("leaves out a block of any other type, such as a retired one", () => {
		const retired = { _type: "ita_retired_note", label: "บล็อกชนิดที่เลิกใช้" } as unknown;
		const groups = groupEvidence([
			retired as EvidenceBlock,
			requirement("1", "ข้อมูลพื้นฐาน"),
			retired as EvidenceBlock,
			file("1.1 นโยบายของผู้บริหาร", "memo.pdf"),
		]);

		assert.deepEqual(groups.lead, []);
		assert.deepEqual(
			groups.cards.map((card) => card.evidence.map((piece) => piece.label)),
			[["1.1 นโยบายของผู้บริหาร"]],
		);
		assert.equal(groups.total, 1);
	});

	it("counts the MOIT's Evidence and each card's with its sub-Requirements'", () => {
		const groups = groupEvidence([
			file("คู่มือการประเมิน", "memo.pdf"),
			requirement("1", "ข้อมูลพื้นฐาน"),
			file("1.1 นโยบายของผู้บริหาร", "memo.pdf"),
			link("1.2 ข้อมูลผู้บริหาร", "/about/leadership"),
			requirement("1.3", "โครงสร้างหน่วยงาน"),
			file("โครงสร้างหน่วยงาน", "deleted.pdf"),
			link("ผังโครงสร้าง", "javascript:void 0"),
			requirement("2", "ข้อที่ยังไม่มีหลักฐาน"),
			requirement("3", "แผนปฏิบัติการ"),
			requirement("3.1", "แผนปฏิบัติการประจำปี"),
			file("แผนปฏิบัติการประจำปี", "deleted.pdf"),
		]);

		assert.deepEqual(
			groups.cards.map((card) => card.count),
			[4, 0, 1],
		);
		assert.equal(groups.total, 6, "every piece of Evidence, the lead included");
	});

	it("shows nothing for a MOIT without Evidence blocks", () => {
		for (const blocks of [[], null, undefined]) {
			assert.deepEqual(groupEvidence(blocks), { lead: [], cards: [], total: 0 });
		}
	});
});

describe("moitEvidence", () => {
	it("groups the pills as groupEvidence groups the blocks, and counts the files that cannot be served", async () => {
		const evidence = await moitEvidence(
			[
				file("คู่มือการประเมิน", "memo.pdf"),
				requirement("1", "ข้อมูลพื้นฐาน"),
				link("1.1 ข้อมูลผู้บริหาร", "/about/leadership"),
				requirement("1.2", "โครงสร้างหน่วยงาน"),
				file("โครงสร้างหน่วยงาน", "deleted.pdf"),
				requirement("2", "แผนปฏิบัติการ"),
				file("แผนปฏิบัติการประจำปี", "deleted.pdf"),
			],
			OPTIONS,
		);

		assert.deepEqual(
			evidence.lead.map((pill) => [pill.kind, pill.label]),
			[["file", "คู่มือการประเมิน"]],
		);
		assert.deepEqual(
			evidence.cards.map((card) => ({
				requirement: `${card.number} ${card.title}`,
				count: card.count,
				pills: card.evidence.map((pill) => [pill.kind, pill.label]),
				subRequirements: card.subRequirements.map((sub) => ({
					requirement: `${sub.number} ${sub.title}`,
					pills: sub.evidence.map((pill) => [pill.kind, pill.label]),
				})),
			})),
			[
				{
					requirement: "1 ข้อมูลพื้นฐาน",
					count: 2,
					pills: [["page", "1.1 ข้อมูลผู้บริหาร"]],
					subRequirements: [
						{
							requirement: "1.2 โครงสร้างหน่วยงาน",
							pills: [["unavailable", "โครงสร้างหน่วยงาน"]],
						},
					],
				},
				{
					requirement: "2 แผนปฏิบัติการ",
					count: 1,
					pills: [["unavailable", "แผนปฏิบัติการประจำปี"]],
					subRequirements: [],
				},
			],
		);
		assert.equal(evidence.total, 4);
		assert.equal(evidence.unavailable, 2, "the files that cannot be served");
	});

	it("offers a file that can be served for download with its type and size, under its uploaded name, and marks one that cannot as unavailable", async () => {
		assert.deepEqual(
			await pillsOf([
				file("1.1 บันทึกข้อความเสนอ ผบห.", "memo.pdf"),
				file("1.2 ฟอร์มเผยแพร่ที่ถูกลบออกจากคลังสื่อ", "deleted.pdf"),
				{ ...file("1.3 ไฟล์ที่ยังไม่ได้เลือก", "none.pdf"), file: null } as EvidenceBlock,
			]),
			[
				{
					kind: "file",
					label: "1.1 บันทึกข้อความเสนอ ผบห.",
					href: "/_emdash/api/media/file/memo.pdf",
					detail: "PDF, 245 KB",
					filename: "memo.pdf",
				},
				{ kind: "unavailable", label: "1.2 ฟอร์มเผยแพร่ที่ถูกลบออกจากคลังสื่อ" },
				{ kind: "unavailable", label: "1.3 ไฟล์ที่ยังไม่ได้เลือก" },
			],
		);
	});

	it("tells a page of this site from another website by the link's address, and keeps whether staff marked it current", async () => {
		assert.deepEqual(
			await pillsOf([
				link("1.1 ข้อมูลผู้บริหาร", "/about/leadership", { current: true }),
				link("1.6 ข่าวประชาสัมพันธ์", `${SITE}/news?page=2`),
				link("1.5 กฎหมายที่เกี่ยวข้อง", "https://stopcorruption.moph.go.th/laws?year=2570"),
				link("1.8 ช่องทางรับฟังความคิดเห็น", "HTTP://www.example.go.th:8080/form", {
					current: true,
				}),
				link("1.9 ไม่ได้ระบุ", "/contact", { current: null }),
			]),
			[
				{
					kind: "page",
					label: "1.1 ข้อมูลผู้บริหาร",
					href: "/about/leadership",
					detail: "หน้าเว็บของสำนักงาน",
					current: true,
				},
				{
					kind: "page",
					label: "1.6 ข่าวประชาสัมพันธ์",
					href: `${SITE}/news?page=2`,
					detail: "หน้าเว็บของสำนักงาน",
					current: false,
				},
				{
					kind: "external",
					label: "1.5 กฎหมายที่เกี่ยวข้อง",
					href: "https://stopcorruption.moph.go.th/laws?year=2570",
					detail: "stopcorruption.moph.go.th",
					current: false,
				},
				{
					kind: "external",
					label: "1.8 ช่องทางรับฟังความคิดเห็น",
					href: "HTTP://www.example.go.th:8080/form",
					detail: "www.example.go.th",
					current: true,
				},
				{
					kind: "page",
					label: "1.9 ไม่ได้ระบุ",
					href: "/contact",
					detail: "หน้าเว็บของสำนักงาน",
					current: false,
				},
			],
		);
	});

	it("opens an email address or a telephone number in place and shows it, as ContentLink does", async () => {
		assert.deepEqual(
			await pillsOf([
				link("ช่องทางร้องเรียน", "mailto:saraban@example.go.th?subject=ITA"),
				link("โทรติดต่อ", "TEL:054%20000%20000", { current: true }),
				link("โทรผิดรูปแบบ", "tel:%E0%B8"),
			]),
			[
				{
					kind: "contact",
					label: "ช่องทางร้องเรียน",
					href: "mailto:saraban@example.go.th?subject=ITA",
					detail: "saraban@example.go.th",
					current: false,
				},
				{
					kind: "contact",
					label: "โทรติดต่อ",
					href: "TEL:054%20000%20000",
					detail: "054 000 000",
					current: true,
				},
				{
					kind: "contact",
					label: "โทรผิดรูปแบบ",
					href: "tel:%E0%B8",
					detail: "%E0%B8",
					current: false,
				},
			],
		);
	});

	it("shows a link whose address the page cannot open safely as its label alone", async () => {
		const addresses = [
			"//evil.example/path",
			"/\\evil.example/path",
			"/\t/evil.example/path",
			" https://evil.example/",
			"javascript:alert(1)",
			"data:text/html,<p>",
			"mailto:",
			"#section",
			"https://",
			"www.example.go.th",
			"",
		];

		assert.deepEqual(
			await pillsOf(addresses.map((url) => link(`หลักฐาน ${url}`, url, { current: true }))),
			addresses.map((url) => ({ kind: "unlinked", label: `หลักฐาน ${url}`, current: true })),
		);
	});

	it("names the Round of each piece of Evidence, and none for ไม่ระบุรอบ, an empty value or a missing one", async () => {
		const { round: _, ...withoutRound } = file("ไม่มีค่า", "memo.pdf") as { round?: unknown };
		const pills = await pillsOf([
			file("รายงานรอบ 6 เดือน", "memo.pdf", { round: "รอบ 6 เดือน" }),
			link("ผลการดำเนินงานรอบ 12 เดือน", "/news", { round: "รอบ 12 เดือน" }),
			file("ไฟล์รอบ 12 เดือนที่ถูกลบ", "deleted.pdf", { round: "รอบ 12 เดือน" }),
			link("ลิงก์ที่เปิดไม่ได้รอบ 6 เดือน", "javascript:void 0", { round: "รอบ 6 เดือน" }),
			file("ค่าที่ตัวเลือกไม่มีแล้ว", "memo.pdf", { round: "รอบ 3 เดือน" }),
			file("ไม่ระบุรอบ", "memo.pdf", { round: "ไม่ระบุรอบ" }),
			file("ค่าว่าง", "memo.pdf", { round: " " }),
			file("ไม่มีค่า null", "memo.pdf", { round: null }),
			withoutRound as EvidenceBlock,
		]);

		assert.deepEqual(
			pills.map((pill) => [pill.label, "round" in pill ? pill.round : "none"]),
			[
				["รายงานรอบ 6 เดือน", "รอบ 6 เดือน"],
				["ผลการดำเนินงานรอบ 12 เดือน", "รอบ 12 เดือน"],
				["ไฟล์รอบ 12 เดือนที่ถูกลบ", "รอบ 12 เดือน"],
				["ลิงก์ที่เปิดไม่ได้รอบ 6 เดือน", "รอบ 6 เดือน"],
				["ค่าที่ตัวเลือกไม่มีแล้ว", "รอบ 3 เดือน"],
				["ไม่ระบุรอบ", "none"],
				["ค่าว่าง", "none"],
				["ไม่มีค่า null", "none"],
				["ไม่มีค่า", "none"],
			],
		);
	});

	it("shows a file's note, such as the months it covers, when staff set one", async () => {
		const pills = await pillsOf([
			file("รายงานผลการดำเนินงาน", "memo.pdf", { note: "ต.ค. 2569 – มี.ค. 2570" }),
			file("ไฟล์ที่ถูกลบ", "deleted.pdf", { note: " เม.ย. – ก.ย. 2570 " }),
			file("หมายเหตุว่าง", "memo.pdf", { note: "  " }),
			file("ไม่มีหมายเหตุ", "memo.pdf", { note: null }),
		]);

		assert.deepEqual(
			pills.map((pill) => [pill.label, "note" in pill ? pill.note : "none"]),
			[
				["รายงานผลการดำเนินงาน", "ต.ค. 2569 – มี.ค. 2570"],
				["ไฟล์ที่ถูกลบ", "เม.ย. – ก.ย. 2570"],
				["หมายเหตุว่าง", "none"],
				["ไม่มีหมายเหตุ", "none"],
			],
		);
	});
});

describe("moitPath", () => {
	it("is /ita/{slug}, the collection's URL pattern, with the slug encoded as EmDash encodes it", () => {
		assert.equal(moitPath("moit-2-2570"), "/ita/moit-2-2570");
		assert.equal(
			moitPath("ตัวชี้วัด 2"),
			"/ita/%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%8A%E0%B8%B5%E0%B9%89%E0%B8%A7%E0%B8%B1%E0%B8%94%202",
		);
	});
});

describe("moitLabel", () => {
	it("names a MOIT by its number, as the manual does", () => {
		assert.equal(moitLabel(2), "MOIT 2");
	});
});

// A MOIT's Evidence as its page shows it (#123; spec #121 "Content model" (the grouping rule) and
// "Public routes", ADR 0006).
//
// - A Requirement block opens a group, and the Evidence blocks that follow belong to it, in block
//   order.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DownloadableFile } from "../../src/lib/media.ts";
import { moitEvidence, moitLabel, moitPath, type EvidenceBlock } from "../../src/lib/ita.ts";

/** The site's own origin, as the page passes its request's. */
const SITE = "https://songhealth.example";

let lastKey = 0;
const nextKey = () => `block-${(lastKey += 1)}`;

function requirement(number: string, title: string): EvidenceBlock {
	return { _type: "ita_requirement", _key: nextKey(), number, title };
}

/** A file block whose file is stored under `storageKey`. */
function file(label: string, storageKey: string, fields: Record<string, unknown> = {}) {
	return {
		_type: "ita_file",
		_key: nextKey(),
		label,
		file: { id: storageKey, provider: "local", filename: storageKey, meta: { storageKey } },
		round: "ไม่ระบุรอบ",
		...fields,
	} as EvidenceBlock;
}

function link(label: string, url: string, fields: Record<string, unknown> = {}) {
	return {
		_type: "ita_link",
		_key: nextKey(),
		label,
		url,
		round: "ไม่ระบุรอบ",
		...fields,
	} as EvidenceBlock;
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

/** Each card's number and title, with its own Evidence labels and each sub-Requirement's. */
function outline(evidence: Awaited<ReturnType<typeof moitEvidence>>) {
	return evidence.cards.map((card) => ({
		requirement: `${card.number} ${card.title}`,
		evidence: card.pills.map((pill) => pill.label),
		subRequirements: card.subRequirements.map((sub) => ({
			requirement: `${sub.number} ${sub.title}`,
			evidence: sub.pills.map((pill) => pill.label),
		})),
	}));
}

describe("moitEvidence", () => {
	it("groups the Evidence blocks that follow a Requirement block under it, in block order", async () => {
		const evidence = await moitEvidence(
			[
				requirement("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
				file("1.1 บันทึกข้อความเสนอ ผบห.", "memo.pdf"),
				link("1.2 ข้อมูลผู้บริหาร", "/about/leadership"),
				requirement("2", "รายงานการกำกับติดตาม"),
				file("2.1 ฟอร์มเผยแพร่", "form.pdf"),
			],
			OPTIONS,
		);

		assert.deepEqual(outline(evidence), [
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
		]);
	});

	it("puts a Requirement whose number has a dot, two dots included, in the card of the last Requirement without one", async () => {
		const evidence = await moitEvidence(
			[
				requirement("6", "ยุทธศาสตร์ชาติ จำนวน 3 ระดับ"),
				file("6.1 แผนระดับที่ 1", "memo.pdf"),
				requirement("6.2", "แผนระดับที่ 2"),
				file("แผนแม่บทภายใต้ยุทธศาสตร์ชาติ", "memo.pdf"),
				requirement("6.2.1", "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ"),
				link("แผนพัฒนาฯ ฉบับที่ 13", "https://www.nesdc.go.th/"),
				requirement("7", "แผนปฏิบัติราชการ"),
				requirement("7.1", "แผนปฏิบัติราชการด้านการป้องกันการทุจริต"),
				file("7.1 แผนปฏิบัติราชการ ระยะที่ 2", "form.pdf"),
			],
			OPTIONS,
		);

		assert.deepEqual(outline(evidence), [
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
		]);
	});

	it("shows the Evidence before any Requirement first, ungrouped, and keeps a Requirement without Evidence", async () => {
		const evidence = await moitEvidence(
			[
				file("คู่มือการประเมิน ITA", "memo.pdf"),
				link("เว็บไซต์ ITA ของกระทรวง", "https://ita.moph.go.th/"),
				requirement("1", "ข้อมูลพื้นฐาน"),
				requirement("2", "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"),
				file("วิสัยทัศน์ พันธกิจ ค่านิยม MOPH", "form.pdf"),
				requirement("3", "ข้อที่ยังไม่มีหลักฐาน"),
			],
			OPTIONS,
		);

		assert.deepEqual(
			evidence.lead.map((pill) => pill.label),
			["คู่มือการประเมิน ITA", "เว็บไซต์ ITA ของกระทรวง"],
		);
		assert.deepEqual(outline(evidence), [
			{ requirement: "1 ข้อมูลพื้นฐาน", evidence: [], subRequirements: [] },
			{
				requirement: "2 วิสัยทัศน์ พันธกิจ ค่านิยม MOPH",
				evidence: ["วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"],
				subRequirements: [],
			},
			{ requirement: "3 ข้อที่ยังไม่มีหลักฐาน", evidence: [], subRequirements: [] },
		]);
	});

	it("shows a sub-Requirement that no Requirement without a dot comes before as a card of its own", async () => {
		const evidence = await moitEvidence(
			[requirement("1.1", "ข้อย่อยที่มาก่อนข้อหลัก"), file("หลักฐาน", "memo.pdf")],
			OPTIONS,
		);

		assert.deepEqual(outline(evidence), [
			{ requirement: "1.1 ข้อย่อยที่มาก่อนข้อหลัก", evidence: ["หลักฐาน"], subRequirements: [] },
		]);
	});

	it("reads a number's trailing dot and spaces as punctuation, as the manual writes 1.", async () => {
		const evidence = await moitEvidence(
			[
				requirement("1.", "ข้อมูลพื้นฐาน"),
				requirement(" 1.1. ", "ข้อมูลผู้บริหาร"),
				requirement(" 2 ", "วิสัยทัศน์"),
			],
			OPTIONS,
		);

		assert.deepEqual(outline(evidence), [
			{
				requirement: "1 ข้อมูลพื้นฐาน",
				evidence: [],
				subRequirements: [{ requirement: "1.1 ข้อมูลผู้บริหาร", evidence: [] }],
			},
			{ requirement: "2 วิสัยทัศน์", evidence: [], subRequirements: [] },
		]);
	});

	it("offers a file that can be served for download with its type and size, under its uploaded name, and marks one that cannot as unavailable", async () => {
		const blocks = [
			requirement("1", "คำสั่ง / ประกาศ"),
			file("1.1 บันทึกข้อความเสนอ ผบห.", "memo.pdf"),
			file("1.2 ฟอร์มเผยแพร่ที่ถูกลบออกจากคลังสื่อ", "deleted.pdf"),
			{ ...file("1.3 ไฟล์ที่ยังไม่ได้เลือก", "none.pdf"), file: null } as EvidenceBlock,
		];
		const evidence = await moitEvidence(blocks, OPTIONS);

		assert.deepEqual(evidence.cards[0]?.pills, [
			{
				kind: "file",
				key: blocks[1]?._key,
				label: "1.1 บันทึกข้อความเสนอ ผบห.",
				href: "/_emdash/api/media/file/memo.pdf",
				detail: "PDF, 245 KB",
				filename: "memo.pdf",
			},
			{
				kind: "unavailable",
				key: blocks[2]?._key,
				label: "1.2 ฟอร์มเผยแพร่ที่ถูกลบออกจากคลังสื่อ",
			},
			{ kind: "unavailable", key: blocks[3]?._key, label: "1.3 ไฟล์ที่ยังไม่ได้เลือก" },
		]);
	});

	it("tells a page of this site from another website by the link's address, and keeps whether staff marked it current", async () => {
		const blocks = [
			link("1.1 ข้อมูลผู้บริหาร", "/about/leadership", { current: true }),
			link("1.6 ข่าวประชาสัมพันธ์", `${SITE}/news?page=2`),
			link("1.5 กฎหมายที่เกี่ยวข้อง", "https://stopcorruption.moph.go.th/laws?year=2570"),
			link("1.8 ช่องทางรับฟังความคิดเห็น", "HTTP://www.example.go.th:8080/form", {
				current: true,
			}),
			link("1.9 ไม่ได้ระบุ", "/contact", { current: null }),
		];
		const evidence = await moitEvidence(blocks, OPTIONS);

		assert.deepEqual(evidence.lead, [
			{
				kind: "page",
				key: blocks[0]?._key,
				label: "1.1 ข้อมูลผู้บริหาร",
				href: "/about/leadership",
				detail: "หน้าเว็บของสำนักงาน",
				current: true,
			},
			{
				kind: "page",
				key: blocks[1]?._key,
				label: "1.6 ข่าวประชาสัมพันธ์",
				href: `${SITE}/news?page=2`,
				detail: "หน้าเว็บของสำนักงาน",
				current: false,
			},
			{
				kind: "external",
				key: blocks[2]?._key,
				label: "1.5 กฎหมายที่เกี่ยวข้อง",
				href: "https://stopcorruption.moph.go.th/laws?year=2570",
				detail: "stopcorruption.moph.go.th",
				current: false,
			},
			{
				kind: "external",
				key: blocks[3]?._key,
				label: "1.8 ช่องทางรับฟังความคิดเห็น",
				href: "HTTP://www.example.go.th:8080/form",
				detail: "www.example.go.th",
				current: true,
			},
			{
				kind: "page",
				key: blocks[4]?._key,
				label: "1.9 ไม่ได้ระบุ",
				href: "/contact",
				detail: "หน้าเว็บของสำนักงาน",
				current: false,
			},
		]);
	});

	it("shows a link whose address is not a web page it can open safely as its label alone", async () => {
		const addresses = [
			"//evil.example/path",
			"/\\evil.example/path",
			"/\t/evil.example/path",
			"javascript:alert(1)",
			"data:text/html,<p>",
			"mailto:saraban@example.go.th",
			"tel:054000000",
			"#section",
			"https://",
			"www.example.go.th",
			"",
		];
		const blocks = addresses.map((url) => link(`หลักฐาน ${url}`, url, { current: true }));
		const evidence = await moitEvidence(blocks, OPTIONS);

		assert.deepEqual(
			evidence.lead,
			blocks.map((block, index) => ({
				kind: "unlinked",
				key: block._key,
				label: `หลักฐาน ${addresses[index]}`,
				current: true,
			})),
		);
	});

	it("tags Evidence with its Round, and with none for ไม่ระบุรอบ, an unknown value or a missing one", async () => {
		const { round: _, ...withoutRound } = file("ไม่มีค่า", "memo.pdf") as { round?: unknown };
		const blocks = [
			file("รายงานรอบ 6 เดือน", "memo.pdf", { round: "รอบ 6 เดือน" }),
			link("ผลการดำเนินงานรอบ 12 เดือน", "/news", { round: "รอบ 12 เดือน" }),
			file("ไฟล์รอบ 12 เดือนที่ถูกลบ", "deleted.pdf", { round: "รอบ 12 เดือน" }),
			link("ลิงก์ที่ใช้ไม่ได้รอบ 6 เดือน", "javascript:void 0", { round: "รอบ 6 เดือน" }),
			file("ไม่ระบุรอบ", "memo.pdf", { round: "ไม่ระบุรอบ" }),
			file("ค่าที่ไม่รู้จัก", "memo.pdf", { round: "รอบ 3 เดือน" }),
			file("ค่าว่าง", "memo.pdf", { round: null }),
			withoutRound as EvidenceBlock,
		];
		const evidence = await moitEvidence(blocks, OPTIONS);

		assert.deepEqual(
			evidence.lead.map((pill) => [pill.label, pill.round]),
			[
				["รายงานรอบ 6 เดือน", "รอบ 6 เดือน"],
				["ผลการดำเนินงานรอบ 12 เดือน", "รอบ 12 เดือน"],
				["ไฟล์รอบ 12 เดือนที่ถูกลบ", "รอบ 12 เดือน"],
				["ลิงก์ที่ใช้ไม่ได้รอบ 6 เดือน", "รอบ 6 เดือน"],
				["ไม่ระบุรอบ", undefined],
				["ค่าที่ไม่รู้จัก", undefined],
				["ค่าว่าง", undefined],
				["ไม่มีค่า", undefined],
			],
		);
		assert.equal(
			evidence.lead.filter((pill) => "round" in pill).length,
			4,
			"a pill without a Round has no round at all",
		);
	});

	it("shows a file's note, such as the months it covers, when staff set one", async () => {
		const blocks = [
			file("รายงานผลการดำเนินงาน", "memo.pdf", { note: "ต.ค. 2569 – มี.ค. 2570" }),
			file("ไฟล์ที่ถูกลบ", "deleted.pdf", { note: " เม.ย. – ก.ย. 2570 " }),
			file("หมายเหตุว่าง", "memo.pdf", { note: "  " }),
			file("ไม่มีหมายเหตุ", "memo.pdf", { note: null }),
		];
		const evidence = await moitEvidence(blocks, OPTIONS);

		assert.deepEqual(
			evidence.lead.map((pill) => [pill.label, "note" in pill ? pill.note : "none"]),
			[
				["รายงานผลการดำเนินงาน", "ต.ค. 2569 – มี.ค. 2570"],
				["ไฟล์ที่ถูกลบ", "เม.ย. – ก.ย. 2570"],
				["หมายเหตุว่าง", "none"],
				["ไม่มีหมายเหตุ", "none"],
			],
		);
	});

	it("counts the MOIT's Evidence, each card's with its sub-Requirements', and the files that cannot be served", async () => {
		const evidence = await moitEvidence(
			[
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
			],
			OPTIONS,
		);

		assert.equal(evidence.total, 6, "every piece of Evidence, the lead included");
		assert.deepEqual(
			evidence.cards.map((card) => card.count),
			[4, 0, 1],
		);
		assert.equal(evidence.unavailable, 2, "the files that cannot be served");
	});

	it("shows nothing for a MOIT without Evidence blocks", async () => {
		for (const blocks of [[], null, undefined]) {
			const evidence = await moitEvidence(blocks, OPTIONS);
			assert.deepEqual(evidence.lead, []);
			assert.deepEqual(evidence.cards, []);
		}
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

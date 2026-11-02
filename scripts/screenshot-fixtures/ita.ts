// Screenshot content for the MOIT page (#123): two published MOITs of fiscal year 2570 that follow
// the ITA prototype's samples, themselves the legacy site's 2569 MOIT 1 and MOIT 2
// (docs/research/legacy-ita.md). The short one has one file deleted from the library, for the
// unavailable pill; the long one has about 60 blocks, Rounds, links to this site marked current
// and links to other websites. Captures both MOIT pages.

import type { Fixtures } from "../capture-with-fixtures.ts";

const YEAR = 2570;
const ROUNDS = ["รอบ 6 เดือน", "รอบ 12 เดือน"] as const;

/** The sample files, by the role each plays in the Evidence. */
const FILES = ["memo", "document", "form", "report", "missing"] as const;
type File = (typeof FILES)[number];

/** A Requirement, a file, or a link, in block order. */
type Line =
	| { r: string; t: string }
	| { f: string; file: File; round?: 0 | 1; note?: string }
	| { l: string; url: string; round?: 0 | 1; current?: boolean };

const SHORT: Line[] = [
	{ r: "1", t: "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง (ของปีงบประมาณ พ.ศ. 2570)" },
	{ f: "1.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", file: "memo" },
	{ f: "1.2 คำสั่ง / ประกาศ โดย ผบห.สูงสุดของหน่วยงาน", file: "document" },
	{ f: "1.3 กรอบแนวทางการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงาน", file: "document" },
	{ f: "1.4 ฟอร์มเผยแพร่", file: "form" },
	{
		r: "2",
		t: "รายงานการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงานในปีที่ผ่านมา (ของปีงบประมาณ พ.ศ. 2569)",
	},
	{ f: "2.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", file: "memo" },
	{ f: "2.2 รายงานผลการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะปีที่ผ่านมา", file: "report" },
	{ f: "2.3 ฟอร์มเผยแพร่", file: "missing" },
];

/** One Requirement with one file of the same name, as MOIT 2 has for its standing documents. */
const standing = (number: string, title: string): Line[] => [
	{ r: number, t: title },
	{ f: title, file: "document" },
];

const LONG: Line[] = [
	{ r: "1", t: "ข้อมูลพื้นฐานที่เป็นปัจจุบัน" },
	{ l: "1.1 ข้อมูลผู้บริหาร แสดงรายนาม", url: "/about/leadership", current: true },
	{ f: "1.2 นโยบายของผู้บริหาร", file: "document" },
	{ f: "1.3 โครงสร้างหน่วยงาน", file: "document" },
	{
		f: "1.4 หน้าที่และอำนาจของหน่วยงานตามกฎหมายจัดตั้งหรือกฎหมายอื่นที่เกี่ยวข้อง",
		file: "document",
	},
	{
		l: "1.5 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน หรือการปฏิบัติงานของหน่วยงาน",
		url: "https://stopcorruption.moph.go.th/",
	},
	{ l: "1.6 ข่าวประชาสัมพันธ์ ที่เกิดขึ้นในปีงบประมาณ พ.ศ. 2570", url: "/news", current: true },
	{ l: "1.7 ข้อมูลการติดต่อหน่วยงาน", url: "/contact", current: true },
	{
		f: "1.8 ช่องทางการรับฟังความคิดเห็นที่บุคคลภายนอกสามารถแสดงความคิดเห็นต่อการดำเนินงานตามหน้าที่และอำนาจและตามภารกิจของหน่วยงาน",
		file: "document",
	},
	...standing("2", "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"),
	...standing("3", "พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ. 2562"),
	...standing("4", "ประมวลจริยธรรมข้าราชการพลเรือน พ.ศ. 2564"),
	...standing("5", "ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐ สำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564"),
	{ r: "6", t: "ยุทธศาสตร์ชาติ จำนวน 3 ระดับ" },
	{ f: "6.1 แผนระดับที่ 1 ยุทธศาสตร์ชาติ พ.ศ. 2561 – 2580", file: "document" },
	{ r: "6.2", t: "แผนระดับที่ 2" },
	{ f: "แผนแม่บทภายใต้ยุทธศาสตร์ชาติ (พ.ศ. 2566 – 2580) (ฉบับแก้ไขเพิ่มเติม)", file: "document" },
	{ f: "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13 (พ.ศ. 2566 – 2570)", file: "document" },
	{ f: "นโยบายและแผนระดับชาติว่าด้วยความมั่นคงแห่งชาติ (พ.ศ. 2566 – 2570)", file: "document" },
	{
		r: "6.3",
		t: "แผนระดับที่ 3 ที่เกี่ยวข้องกับการต่อต้านการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม",
	},
	{
		f: "แผนปฏิบัติการด้านการต่อต้านการทุจริตและประพฤติมิชอบ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		file: "document",
	},
	{
		f: "แผนปฏิบัติการด้านการส่งเสริมคุณธรรมแห่งชาติ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		file: "document",
	},
	{
		r: "7",
		t: "แผนปฏิบัติราชการด้านการป้องกันปราบปรามการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม ของกระทรวงสาธารณสุข",
	},
	{
		f: "7.1 แผนปฏิบัติราชการด้านการป้องกัน ปราบปรามการทุจริตและประพฤติมิชอบ กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		file: "document",
	},
	{
		f: "7.2 แผนปฏิบัติราชการด้านส่งเสริมคุณธรรม จริยธรรม กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		file: "document",
	},
	...standing("8", "นโยบายและยุทธศาสตร์ของหน่วยงาน"),
	{ r: "9", t: "แผนปฏิบัติการประจำปีของหน่วยงาน (ทุกแผน)" },
	{ f: "แผนปฏิบัติการประจำปีของหน่วยงาน", file: "document" },
	{ r: "10", t: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปีของหน่วยงาน (ตามข้อ 9)" },
	{
		f: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี",
		file: "report",
		round: 0,
		note: "ต.ค. 2569 – มี.ค. 2570",
	},
	{ f: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี", file: "report", round: 1 },
	{
		r: "11",
		t: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน และผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน",
	},
	{ f: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", file: "document", round: 0 },
	{ f: "ผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", file: "report", round: 0 },
	{ f: "แผนและผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", file: "report", round: 1 },
	...standing("12", "คู่มือการปฏิบัติงานการร้องเรียนการปฏิบัติงานหรือให้บริการของเจ้าหน้าที่"),
	...standing("13", "คู่มือการปฏิบัติงานการร้องเรียนการทุจริตและประพฤติมิชอบ"),
	{ r: "14", t: "คู่มือขั้นตอนการให้บริการ" },
	{ l: "คู่มือขั้นตอนการให้บริการ (อย.)", url: "https://www.fda.moph.go.th/" },
	{ r: "15", t: "ข้อมูลการจัดซื้อจัดจ้าง" },
	{
		f: "15.1 การวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณ พ.ศ. 2569",
		file: "report",
	},
	{ f: "15.2 แผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570", file: "document" },
	{
		r: "15.3",
		t: "ผลการดำเนินการตามแผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570",
	},
	{ f: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", file: "report", round: 0 },
	{ f: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", file: "report", round: 1 },
	{ r: "15.4", t: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้าง" },
	{ f: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างไม่เกิน 100,000 บาท", file: "form" },
	{ f: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างเกิน 100,000 บาท", file: "form" },
];

const fixtures: Fixtures = async ({ admin, helpers }) => {
	const files = new Map<File, Record<string, unknown>>();
	const missing = await helpers.uploadSyntheticPdf(
		admin,
		`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-ita-missing.pdf`,
	);
	files.set("missing", missing.value);
	for (const file of FILES.filter((key) => key !== "missing")) {
		const pdf = await helpers.uploadSyntheticPdf(
			admin,
			`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-ita-${file}.pdf`,
		);
		files.set(file, pdf.value);
	}
	const blocksOf = (lines: Line[]) =>
		lines.map((line) => {
			if ("r" in line) return { _type: "ita_requirement", number: line.r, title: line.t };
			const round = line.round === undefined ? "ไม่ระบุรอบ" : ROUNDS[line.round];
			if ("f" in line) {
				return {
					_type: "ita_file",
					label: line.f,
					file: files.get(line.file),
					round,
					...(line.note ? { note: line.note } : {}),
				};
			}
			return { _type: "ita_link", label: line.l, url: line.url, round, current: !!line.current };
		});
	const moits = [
		{
			number: 1,
			title:
				"[ตัวอย่าง] หน่วยงานมีการวางระบบโดยการกำหนดมาตรการการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงาน",
			summary:
				"คำสั่งหรือประกาศที่กำหนดกรอบแนวทางการเผยแพร่ข้อมูล และรายงานการกำกับติดตามของปีที่ผ่านมา",
			lines: SHORT,
		},
		{
			number: 2,
			title: "[ตัวอย่าง] หน่วยงานมีการเปิดเผยข้อมูลข่าวสารที่เป็นปัจจุบัน",
			summary:
				"ข้อมูลพื้นฐาน กฎหมายและแผนที่เกี่ยวข้อง แผนและผลการดำเนินงาน คู่มือ และข้อมูลการจัดซื้อจัดจ้าง",
			lines: LONG,
		},
	];
	const slugs: string[] = [];
	for (const moit of moits) {
		const slug = helpers.syntheticSlug(`shot-moit-${moit.number}`);
		const entry = await helpers.createSyntheticEntry(admin, "moit", {
			slug,
			data: {
				title: moit.title,
				fiscal_year: YEAR,
				number: moit.number,
				summary: moit.summary,
				updated_on: "2026-10-30T03:00:00.000Z",
				evidence: blocksOf(moit.lines),
			},
		});
		if (!entry.result.ok) throw new Error(`moit: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "moit", entry.entryId!);
		slugs.push(slug);
	}
	const removed = await helpers.deleteMedia(admin, missing.mediaId);
	if (!removed.ok) throw new Error(`delete file: ${helpers.nativeRefusalOf(removed)}`);
	return [
		{ name: "moit-short", path: `/ita/${slugs[0]}` },
		{ name: "moit-long", path: `/ita/${slugs[1]}` },
	];
};

export default fixtures;

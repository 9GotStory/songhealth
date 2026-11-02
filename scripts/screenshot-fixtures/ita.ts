// Screenshot content for the MOIT page (#123): two published MOITs of fiscal year 2570 that follow
// the ITA prototype's samples, themselves the legacy site's 2569 MOIT 1 and MOIT 2
// (docs/research/legacy-ita.md). The short one has one file deleted from the library, for the
// unavailable pill; the long one has about 60 blocks, Rounds, links to this site marked current
// and links to other websites. Captures both MOIT pages.

import type { Fixtures } from "../capture-with-fixtures.ts";

const YEAR = 2570;
const ROUNDS = ["รอบ 6 เดือน", "รอบ 12 เดือน"] as const;

/** The sample PDFs, by the role each plays in the Evidence. */
const PDF_ROLES = ["memo", "document", "form", "report", "missing"] as const;
type PdfRole = (typeof PDF_ROLES)[number];

/** A Requirement, a file, or a link, in block order. */
type Line =
	| { requirement: string; title: string }
	| { file: string; pdf: PdfRole; round?: 0 | 1; note?: string }
	| { link: string; url: string; round?: 0 | 1; current?: boolean };

const SHORT: Line[] = [
	{ requirement: "1", title: "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง (ของปีงบประมาณ พ.ศ. 2570)" },
	{ file: "1.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", pdf: "memo" },
	{ file: "1.2 คำสั่ง / ประกาศ โดย ผบห.สูงสุดของหน่วยงาน", pdf: "document" },
	{ file: "1.3 กรอบแนวทางการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงาน", pdf: "document" },
	{ file: "1.4 ฟอร์มเผยแพร่", pdf: "form" },
	{
		requirement: "2",
		title:
			"รายงานการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงานในปีที่ผ่านมา (ของปีงบประมาณ พ.ศ. 2569)",
	},
	{ file: "2.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", pdf: "memo" },
	{ file: "2.2 รายงานผลการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะปีที่ผ่านมา", pdf: "report" },
	{ file: "2.3 ฟอร์มเผยแพร่", pdf: "missing" },
];

/** One Requirement with one file of the same name, as MOIT 2 has for its standing documents. */
const standing = (number: string, title: string): Line[] => [
	{ requirement: number, title },
	{ file: title, pdf: "document" },
];

const LONG: Line[] = [
	{ requirement: "1", title: "ข้อมูลพื้นฐานที่เป็นปัจจุบัน" },
	{ link: "1.1 ข้อมูลผู้บริหาร แสดงรายนาม", url: "/about/leadership", current: true },
	{ file: "1.2 นโยบายของผู้บริหาร", pdf: "document" },
	{ file: "1.3 โครงสร้างหน่วยงาน", pdf: "document" },
	{
		file: "1.4 หน้าที่และอำนาจของหน่วยงานตามกฎหมายจัดตั้งหรือกฎหมายอื่นที่เกี่ยวข้อง",
		pdf: "document",
	},
	{
		link: "1.5 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน หรือการปฏิบัติงานของหน่วยงาน",
		url: "https://stopcorruption.moph.go.th/",
	},
	{ link: "1.6 ข่าวประชาสัมพันธ์ ที่เกิดขึ้นในปีงบประมาณ พ.ศ. 2570", url: "/news", current: true },
	{ link: "1.7 ข้อมูลการติดต่อหน่วยงาน", url: "/contact", current: true },
	{
		file: "1.8 ช่องทางการรับฟังความคิดเห็นที่บุคคลภายนอกสามารถแสดงความคิดเห็นต่อการดำเนินงานตามหน้าที่และอำนาจและตามภารกิจของหน่วยงาน",
		pdf: "document",
	},
	...standing("2", "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH"),
	...standing("3", "พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ. 2562"),
	...standing("4", "ประมวลจริยธรรมข้าราชการพลเรือน พ.ศ. 2564"),
	...standing("5", "ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐ สำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564"),
	{ requirement: "6", title: "ยุทธศาสตร์ชาติ จำนวน 3 ระดับ" },
	{ file: "6.1 แผนระดับที่ 1 ยุทธศาสตร์ชาติ พ.ศ. 2561 – 2580", pdf: "document" },
	{ requirement: "6.2", title: "แผนระดับที่ 2" },
	{ file: "แผนแม่บทภายใต้ยุทธศาสตร์ชาติ (พ.ศ. 2566 – 2580) (ฉบับแก้ไขเพิ่มเติม)", pdf: "document" },
	{ file: "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13 (พ.ศ. 2566 – 2570)", pdf: "document" },
	{ file: "นโยบายและแผนระดับชาติว่าด้วยความมั่นคงแห่งชาติ (พ.ศ. 2566 – 2570)", pdf: "document" },
	{
		requirement: "6.3",
		title:
			"แผนระดับที่ 3 ที่เกี่ยวข้องกับการต่อต้านการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม",
	},
	{
		file: "แผนปฏิบัติการด้านการต่อต้านการทุจริตและประพฤติมิชอบ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		pdf: "document",
	},
	{
		file: "แผนปฏิบัติการด้านการส่งเสริมคุณธรรมแห่งชาติ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		pdf: "document",
	},
	{
		requirement: "7",
		title:
			"แผนปฏิบัติราชการด้านการป้องกันปราบปรามการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม ของกระทรวงสาธารณสุข",
	},
	{
		file: "7.1 แผนปฏิบัติราชการด้านการป้องกัน ปราบปรามการทุจริตและประพฤติมิชอบ กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		pdf: "document",
	},
	{
		file: "7.2 แผนปฏิบัติราชการด้านส่งเสริมคุณธรรม จริยธรรม กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
		pdf: "document",
	},
	...standing("8", "นโยบายและยุทธศาสตร์ของหน่วยงาน"),
	{ requirement: "9", title: "แผนปฏิบัติการประจำปีของหน่วยงาน (ทุกแผน)" },
	{ file: "แผนปฏิบัติการประจำปีของหน่วยงาน", pdf: "document" },
	{ requirement: "10", title: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปีของหน่วยงาน (ตามข้อ 9)" },
	{
		file: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี",
		pdf: "report",
		round: 0,
		note: "ต.ค. 2569 – มี.ค. 2570",
	},
	{ file: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี", pdf: "report", round: 1 },
	{
		requirement: "11",
		title: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน และผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน",
	},
	{ file: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "document", round: 0 },
	{ file: "ผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "report", round: 0 },
	{ file: "แผนและผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "report", round: 1 },
	...standing("12", "คู่มือการปฏิบัติงานการร้องเรียนการปฏิบัติงานหรือให้บริการของเจ้าหน้าที่"),
	...standing("13", "คู่มือการปฏิบัติงานการร้องเรียนการทุจริตและประพฤติมิชอบ"),
	{ requirement: "14", title: "คู่มือขั้นตอนการให้บริการ" },
	{ link: "คู่มือขั้นตอนการให้บริการ (อย.)", url: "https://www.fda.moph.go.th/" },
	{ requirement: "15", title: "ข้อมูลการจัดซื้อจัดจ้าง" },
	{
		file: "15.1 การวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณ พ.ศ. 2569",
		pdf: "report",
	},
	{ file: "15.2 แผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570", pdf: "document" },
	{
		requirement: "15.3",
		title: "ผลการดำเนินการตามแผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570",
	},
	{ file: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", pdf: "report", round: 0 },
	{ file: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", pdf: "report", round: 1 },
	{ requirement: "15.4", title: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้าง" },
	{ file: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างไม่เกิน 100,000 บาท", pdf: "form" },
	{ file: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างเกิน 100,000 บาท", pdf: "form" },
];

const fixtures: Fixtures = async ({ admin, helpers }) => {
	const pdfs = new Map<PdfRole, Record<string, unknown>>();
	const missing = await helpers.uploadSyntheticPdf(
		admin,
		`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-ita-missing.pdf`,
	);
	pdfs.set("missing", missing.value);
	for (const role of PDF_ROLES.filter((key) => key !== "missing")) {
		const pdf = await helpers.uploadSyntheticPdf(
			admin,
			`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-ita-${role}.pdf`,
		);
		pdfs.set(role, pdf.value);
	}
	const blocksOf = (lines: Line[]) =>
		lines.map((line) => {
			if ("requirement" in line) {
				return { _type: "ita_requirement", number: line.requirement, title: line.title };
			}
			const round = line.round === undefined ? "ไม่ระบุรอบ" : ROUNDS[line.round];
			if ("file" in line) {
				return {
					_type: "ita_file",
					label: line.file,
					file: pdfs.get(line.pdf),
					round,
					...(line.note ? { note: line.note } : {}),
				};
			}
			return { _type: "ita_link", label: line.link, url: line.url, round, current: !!line.current };
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

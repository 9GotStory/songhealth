// Screenshot content for the ITA search group (#125): published MOITs about การจัดซื้อจัดจ้าง, two of
// fiscal year 2570 and one of 2569 by their titles, the legacy site's MOIT 3 and MOIT 4
// (docs/research/legacy-ita.md), and 2570's MOIT 2 by the labels of its Evidence alone, beside a
// Document, so the results mix kinds. Captures the results of every group and of ITA alone.

import type { Fixtures } from "../capture-with-fixtures.ts";

const QUERY = "จัดซื้อจัดจ้าง";

const fixtures: Fixtures = async ({ admin, helpers }) => {
	const pdf = await helpers.uploadSyntheticPdf(admin);
	const file = (label: string) => ({
		_type: "ita_file",
		label,
		file: pdf.value,
		round: "ไม่ระบุรอบ",
	});
	const requirement = (number: string, title: string) => ({
		_type: "ita_requirement",
		number,
		title,
	});
	const moits = [
		{
			year: 2570,
			number: 3,
			title:
				"[ตัวอย่าง] หน่วยงานมีรายงานการวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณในปีที่ผ่านมา (ของปีงบประมาณ พ.ศ. 2569)",
			summary: "รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้าง ปัญหา อุปสรรค และแนวทางการปรับปรุง",
			evidence: [
				requirement("1", "รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้างของปีที่ผ่านมา"),
				file("1.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน"),
				file("1.2 รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้าง ปีงบประมาณ พ.ศ. 2569"),
			],
		},
		{
			year: 2570,
			number: 4,
			title:
				"[ตัวอย่าง] หน่วยงานมีการวางระบบการจัดซื้อจัดจ้างหรือการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570",
			summary: "แผนการจัดซื้อจัดจ้างประจำปีและประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง",
			evidence: [
				requirement("1", "แผนการจัดซื้อจัดจ้างหรือแผนการจัดหาพัสดุ"),
				file("1.1 แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570"),
			],
		},
		{
			year: 2570,
			number: 2,
			title: "[ตัวอย่าง] หน่วยงานมีการเปิดเผยข้อมูลข่าวสารที่เป็นปัจจุบัน",
			summary:
				"ข้อมูลพื้นฐาน กฎหมายและแผนที่เกี่ยวข้อง แผนและผลการดำเนินงาน คู่มือ และข้อมูลการจัดหาพัสดุ",
			evidence: [
				requirement("15", "ข้อมูลการจัดหาพัสดุ"),
				file("15.1 การวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณ พ.ศ. 2569"),
				file("15.2 แผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570"),
			],
		},
		{
			year: 2569,
			number: 4,
			title:
				"[ตัวอย่าง] หน่วยงานมีการวางระบบการจัดซื้อจัดจ้างหรือการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2569",
			summary: "แผนการจัดซื้อจัดจ้างประจำปีงบประมาณ พ.ศ. 2569",
			evidence: [
				requirement("1", "แผนการจัดซื้อจัดจ้างหรือแผนการจัดหาพัสดุ"),
				file("1.1 แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2569"),
			],
		},
	];
	for (const moit of moits) {
		const entry = await helpers.createSyntheticEntry(admin, "moit", {
			slug: helpers.syntheticSlug(`shot-moit-${moit.number}-${moit.year}`),
			data: {
				title: moit.title,
				fiscal_year: moit.year,
				number: moit.number,
				summary: moit.summary,
				evidence: moit.evidence,
			},
		});
		if (!entry.result.ok) throw new Error(`moit: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "moit", entry.entryId!);
	}
	const document = await helpers.createSyntheticEntry(admin, "documents", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title: "[ตัวอย่าง] ประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570",
			summary: "ประกาศของสำนักงานสาธารณสุขอำเภอสองเรื่องแผนการจัดซื้อจัดจ้างประจำปี",
			file: pdf.value,
		},
	});
	if (!document.result.ok) {
		throw new Error(`documents: ${helpers.nativeRefusalOf(document.result)}`);
	}
	await helpers.publishEntryAt(admin, "documents", document.entryId!);
	const q = encodeURIComponent(QUERY);
	return [
		{ name: "search-ita-all", path: `/search?q=${q}` },
		{ name: "search-ita-group", path: `/search?q=${q}&group=ita` },
	];
};

export default fixtures;

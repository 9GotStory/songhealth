// Screenshot content for the ITA search group (#125): published MOITs about การจัดซื้อจัดจ้าง, titled
// as the legacy site's ITA 2569 page names MOIT 2, 3 and 4. MOIT 3 and MOIT 4 of fiscal year 2570
// and MOIT 4 of 2569, published after them, are found by their titles, 2570's MOIT 2 by the labels
// of its Evidence alone, and a Document beside them mixes the kinds. Captures the results of every
// group and of ITA alone.

import type { Fixtures } from "../capture-with-fixtures.ts";

const QUERY = "จัดซื้อจัดจ้าง";

const fixtures: Fixtures = async ({ admin, helpers }) => {
	const pdf = await helpers.uploadSyntheticPdf(admin);
	const { fileBlock: file, requirementBlock: requirement } = helpers;
	const entries: Array<[collection: string, data: Record<string, unknown>]> = [
		[
			"moit",
			{
				fiscal_year: 2570,
				number: 3,
				title:
					"[ตัวอย่าง] หน่วยงานมีรายงานการวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณในปีที่ผ่านมา (ของปีงบประมาณ พ.ศ. 2569)",
				summary: "รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้าง ปัญหา อุปสรรค และแนวทางการปรับปรุง",
				evidence: [
					requirement("1", "รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้างของปีที่ผ่านมา"),
					file("1.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", pdf),
					file("1.2 รายงานการวิเคราะห์ผลการจัดซื้อจัดจ้าง ปีงบประมาณ พ.ศ. 2569", pdf),
				],
			},
		],
		[
			"moit",
			{
				fiscal_year: 2570,
				number: 4,
				title:
					"[ตัวอย่าง] หน่วยงานมีการวางระบบการจัดซื้อจัดจ้างหรือการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570",
				summary: "แผนการจัดซื้อจัดจ้างประจำปีและประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง",
				evidence: [
					requirement("1", "แผนการจัดซื้อจัดจ้างหรือแผนการจัดหาพัสดุ"),
					file("1.1 แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570", pdf),
				],
			},
		],
		[
			"moit",
			{
				fiscal_year: 2570,
				number: 2,
				title: "[ตัวอย่าง] หน่วยงานมีการเปิดเผยข้อมูลข่าวสารที่เป็นปัจจุบัน",
				summary:
					"ข้อมูลพื้นฐาน กฎหมายและแผนที่เกี่ยวข้อง แผนและผลการดำเนินงาน คู่มือ และข้อมูลการจัดหาพัสดุ",
				evidence: [
					requirement("15", "ข้อมูลการจัดหาพัสดุ"),
					file("15.1 การวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณ พ.ศ. 2569", pdf),
					file("15.2 แผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570", pdf),
				],
			},
		],
		[
			"moit",
			{
				fiscal_year: 2569,
				number: 4,
				title:
					"[ตัวอย่าง] หน่วยงานมีการวางระบบการจัดซื้อจัดจ้างหรือการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2569",
				summary: "แผนการจัดซื้อจัดจ้างประจำปีงบประมาณ พ.ศ. 2569",
				evidence: [
					requirement("1", "แผนการจัดซื้อจัดจ้างหรือแผนการจัดหาพัสดุ"),
					file("1.1 แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2569", pdf),
				],
			},
		],
		[
			"documents",
			{
				title: "[ตัวอย่าง] ประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570",
				summary: "ประกาศของสำนักงานสาธารณสุขอำเภอสองเรื่องแผนการจัดซื้อจัดจ้างประจำปี",
				file: pdf.value,
			},
		],
	];
	for (const [collection, data] of entries) {
		const entry = await helpers.createSyntheticEntry(admin, collection, {
			slug: helpers.syntheticSlug("shot"),
			data,
		});
		if (!entry.result.ok)
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, collection, entry.entryId!);
	}
	const q = encodeURIComponent(QUERY);
	return [
		{ name: "search-ita-all", path: `/search?q=${q}` },
		{ name: "search-ita-group", path: `/search?q=${q}&group=ita` },
	];
};

export default fixtures;

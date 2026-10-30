// Screenshot content for Health Information (#59): three published Health Content items with a
// picture, topic, source and body, one last reviewed; three published Health Reports, two with a
// report date, each pointing to a published report Document. Captures /health, /health/content,
// one Health Content page, /health/reports and one Health Report page.

import type { Fixtures } from "../capture-with-fixtures.ts";

const CONTENT = [
	{
		title: "[ตัวอย่าง] 3 เก็บ ป้องกัน 3 โรค ช่วงฤดูฝน",
		summary: "เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวงจรยุงลาย ป้องกันไข้เลือดออก ไข้ซิกา และไข้ปวดข้อยุงลาย",
		topic: "ไข้เลือดออก",
		reviewedAt: undefined,
		from: "#bae0cf",
		to: "#f2d17a",
	},
	{
		title: "[ตัวอย่าง] กินอย่างไรให้ห่างไกลโรคเบาหวาน",
		summary: "ลดหวาน มัน เค็ม เพิ่มผักผลไม้ และออกกำลังกายสม่ำเสมออย่างน้อยสัปดาห์ละ 150 นาที",
		topic: "โรคไม่ติดต่อเรื้อรัง",
		reviewedAt: undefined,
		from: "#bfdcce",
		to: "#e8f0d9",
	},
	{
		title: "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใครควรได้รับและรับได้ที่ไหน",
		summary:
			"ผู้สูงอายุ ผู้มีโรคเรื้อรัง และหญิงตั้งครรภ์ควรรับวัคซีนปีละครั้ง ที่โรงพยาบาลส่งเสริมสุขภาพตำบล",
		topic: "วัคซีนและการสร้างเสริมภูมิคุ้มกัน",
		reviewedAt: "2026-09-15T03:00:00.000Z",
		from: "#d1ebde",
		to: "#e8f0cc",
	},
];

const REPORTS = [
	{
		title: "[ตัวอย่าง] รายงานสถานการณ์โรคไข้เลือดออก อำเภอสอง ไตรมาส 4/2569",
		summary: "จำนวนผู้ป่วย อัตราป่วย และการดำเนินงานควบคุมโรคไข้เลือดออกรายตำบล",
		type: "รายงานสถานการณ์โรค",
		period: "กรกฎาคม – กันยายน 2569",
		fiscalYear: 2569,
		reportAt: "2026-10-05T03:00:00.000Z",
	},
	{
		title: "[ตัวอย่าง] รายงานผลการดำเนินงานสาธารณสุข อำเภอสอง ปีงบประมาณ 2569",
		summary: "สรุปผลการดำเนินงานตามตัวชี้วัดสำคัญของเครือข่ายบริการสุขภาพอำเภอสอง",
		type: "รายงานผลการดำเนินงาน",
		period: "ตุลาคม 2568 – กันยายน 2569",
		fiscalYear: 2569,
		reportAt: undefined,
	},
	{
		title: "[ตัวอย่าง] รายงานความครอบคลุมการได้รับวัคซีนในเด็ก ไตรมาส 3/2569",
		summary: "ความครอบคลุมการได้รับวัคซีนพื้นฐานของเด็กอายุ 1–5 ปี แยกตามหน่วยบริการ",
		type: "รายงานสถานการณ์โรค",
		period: "เมษายน – มิถุนายน 2569",
		fiscalYear: 2569,
		reportAt: "2026-07-10T03:00:00.000Z",
	},
];

const fixtures: Fixtures = async ({ admin, helpers, term, picture, block }) => {
	const publish = async (collection: string, id: string) => {
		const published = await helpers.publishEntry(admin, collection, id);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	};

	let contentSlug = "";
	for (const content of CONTENT) {
		const slug = helpers.syntheticSlug("shot");
		const created = await helpers.createSyntheticEntry(admin, "health_content", {
			slug,
			data: {
				title: content.title,
				summary: content.summary,
				source_text: "กรมควบคุมโรค กระทรวงสาธารณสุข",
				featured_image: {
					id: await picture(`ภาพประกอบ ${content.title}`, content.from, content.to),
				},
				...(content.reviewedAt ? { reviewed_at: content.reviewedAt } : {}),
				body: [
					block(content.summary),
					block("ข้อควรปฏิบัติ", "h2"),
					block(
						"หากมีอาการผิดปกติ โปรดปรึกษาเจ้าหน้าที่โรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่ หรือโทรสายด่วนกรมควบคุมโรค 1422",
					),
				],
			},
			taxonomies: { topic: [await term("topic", content.topic)] },
		});
		if (!created.result.ok) {
			throw new Error(`health content: ${helpers.nativeRefusalOf(created.result)}`);
		}
		await publish("health_content", created.entryId!);
		contentSlug = slug;
	}

	let reportSlug = "";
	for (const report of REPORTS) {
		const document = await helpers.createSyntheticDocument(admin, "shot", {
			data: {
				title: `[ตัวอย่าง] เอกสาร${report.title.replace("[ตัวอย่าง] ", "")}`,
				fiscal_year: report.fiscalYear,
				owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
			},
			taxonomies: { document_type: [await term("document_type", "รายงาน")] },
		});
		await publish("documents", document.id);
		const slug = helpers.syntheticSlug("shot");
		const created = await helpers.createSyntheticEntry(admin, "health_reports", {
			slug,
			data: {
				title: report.title,
				summary: report.summary,
				reporting_period: report.period,
				fiscal_year: report.fiscalYear,
				owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
				...(report.reportAt ? { report_at: report.reportAt } : {}),
			},
			taxonomies: { report_type: [await term("report_type", report.type)] },
			references: { report_document: [document.id] },
		});
		if (!created.result.ok) {
			throw new Error(`health report: ${helpers.nativeRefusalOf(created.result)}`);
		}
		await publish("health_reports", created.entryId!);
		if (reportSlug === "") reportSlug = slug;
	}

	return [
		"/health",
		"/health/content",
		{ name: "health-content-item", path: `/health/content/${contentSlug}` },
		"/health/reports",
		{ name: "health-report-item", path: `/health/reports/${reportSlug}` },
	];
};

export default fixtures;

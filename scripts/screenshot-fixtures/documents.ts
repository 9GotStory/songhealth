// Screenshot content for the Document repository (#55): published Documents with types, a topic,
// fiscal years and synthetic PDFs, one superseded by a successor and one whose file was deleted.
// Captures /documents, a Document page, the superseded one and the one without its file.

import type { Fixtures } from "../capture-with-fixtures.ts";

const DOCUMENTS = [
	{
		key: "plan",
		title: "[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข อำเภอสอง ปีงบประมาณ 2570",
		summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง ประจำปีงบประมาณ 2570",
		type: "แผนงาน",
		topic: undefined,
		fiscalYear: 2570,
		documentAt: "2026-10-01T03:00:00.000Z",
		status: "current",
	},
	{
		key: "old-plan",
		title: "[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข อำเภอสอง ปีงบประมาณ 2569",
		summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง ประจำปีงบประมาณ 2569",
		type: "แผนงาน",
		topic: undefined,
		fiscalYear: 2569,
		documentAt: "2025-10-01T03:00:00.000Z",
		status: "superseded",
		successor: "plan",
	},
	{
		key: "form",
		title: "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีนไข้หวัดใหญ่สำหรับกลุ่มเสี่ยง",
		summary: "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่",
		type: "แบบฟอร์ม",
		topic: "วัคซีนและการสร้างเสริมภูมิคุ้มกัน",
		fiscalYear: 2570,
		documentAt: "2026-10-15T03:00:00.000Z",
		status: undefined,
	},
	{
		key: "report",
		title: "[ตัวอย่าง] รายงานสถานการณ์โรคไข้เลือดออก ไตรมาส 3/2569",
		summary: "สรุปจำนวนผู้ป่วยและการดำเนินงานควบคุมโรคไข้เลือดออกในอำเภอสอง",
		type: "รายงาน",
		topic: "ไข้เลือดออก",
		fiscalYear: 2569,
		documentAt: "2026-07-10T03:00:00.000Z",
		status: "expired",
		fileGone: true,
	},
] as const;

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const terms = new Map<string, string>();
	const termOf = async (taxonomy: string, label: string) => {
		const key = `${taxonomy}:${label}`;
		if (!terms.has(key)) terms.set(key, await term(taxonomy, label));
		return terms.get(key)!;
	};
	const created = new Map<string, { id: string; slug: string }>();
	// Successors first, so a superseded Document can point at its successor.
	const ordered = [...DOCUMENTS].sort(
		(a, b) => Number("successor" in a) - Number("successor" in b),
	);
	for (const document of ordered) {
		const uploaded = await helpers.uploadSyntheticMedia(admin, {
			filename: `${helpers.SYNTHETIC_FIXTURE_MARK}-shot-${document.key}.pdf`,
			file: { bytes: helpers.syntheticMediaPdf(), type: "application/pdf" },
		});
		const item = helpers.nativeItemOf(uploaded.result) as
			{ id: string; filename: string; mimeType: string; storageKey: string } | undefined;
		if (item === undefined || uploaded.mediaId === undefined) {
			throw new Error(`file: ${helpers.nativeRefusalOf(uploaded.result)}`);
		}
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "documents", {
			slug,
			data: {
				title: document.title,
				summary: document.summary,
				file: {
					id: item.id,
					provider: "local",
					filename: item.filename,
					mimeType: item.mimeType,
					meta: { storageKey: item.storageKey },
				},
				document_at: document.documentAt,
				fiscal_year: document.fiscalYear,
				owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
				...(document.status ? { domain_status: document.status } : {}),
			},
			taxonomies: {
				document_type: [await termOf("document_type", document.type)],
				...(document.topic ? { topic: [await termOf("topic", document.topic)] } : {}),
			},
			...("successor" in document
				? { references: { successor: [created.get(document.successor)!.id] } }
				: {}),
		});
		if (!entry.result.ok) throw new Error(`document: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "documents", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		if ("fileGone" in document) {
			const removed = await helpers.deleteMedia(admin, uploaded.mediaId);
			if (!removed.ok) throw new Error(`delete file: ${helpers.nativeRefusalOf(removed)}`);
		}
		created.set(document.key, { id: entry.entryId!, slug });
	}
	return [
		"/documents",
		`/documents/${created.get("form")!.slug}`,
		`/documents/${created.get("old-plan")!.slug}`,
		`/documents/${created.get("report")!.slug}`,
	];
};

export default fixtures;

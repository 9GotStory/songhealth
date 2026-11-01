// Screenshot content for the Service catalog (#58): published Services from the `00` §8.2 catalog
// in three Service Categories, covering the four ownership types, one with every guidance field and
// a related Document, one offered by two Health Services, and one external digital service.
// Captures /services, the catalog filtered by category, and three Service pages.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, term, block }) => {
	const complaints = await term("service_category", "ร้องเรียนและเสนอแนะ");
	const reports = await term("service_category", "แจ้งปัญหาสุขภาพ");
	const requests = await term("service_category", "ขอข้อมูลและบริการอื่น");

	const file = await helpers.uploadSyntheticPdf(
		admin,
		`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-แบบคำร้องเรียน.pdf`,
	);
	const document = await helpers.createSyntheticEntry(admin, "documents", {
		slug: helpers.syntheticSlug("shot"),
		data: { title: "[ตัวอย่าง] แบบคำร้องเรียนการปฏิบัติงานหรือการให้บริการ", file: file.value },
	});
	if (!document.result.ok) throw new Error(`document: ${helpers.nativeRefusalOf(document.result)}`);
	const documentPublished = await helpers.publishEntry(admin, "documents", document.entryId!);
	if (!documentPublished.ok)
		throw new Error(`publish: ${helpers.nativeRefusalOf(documentPublished)}`);

	const SERVICES = [
		{
			key: "complaint",
			title: "[ตัวอย่าง] ร้องเรียนการปฏิบัติงานหรือการให้บริการ",
			category: complaints,
			data: {
				summary: "แจ้งเรื่องที่ไม่ได้รับความสะดวกหรือไม่เป็นธรรมจากการปฏิบัติงานของเจ้าหน้าที่",
				ownership_type: "direct",
				channels: [
					{ label: "ยื่นเรื่องด้วยตนเองที่สำนักงานสาธารณสุขอำเภอสอง" },
					{ label: "โทรศัพท์ 054 000 000 ในวันและเวลาราชการ", url: "tel:054000000" },
					{ label: "ส่งแบบคำร้องทางไปรษณีย์" },
				],
				eligibility: [block("ประชาชนทั่วไปที่ได้รับผลกระทบจากการปฏิบัติงานหรือการให้บริการ")],
				steps: [
					block("กรอกแบบคำร้องเรียนให้ครบถ้วน พร้อมรายละเอียดเหตุการณ์"),
					block("ยื่นแบบคำร้องต่อเจ้าหน้าที่ หรือส่งทางไปรษณีย์"),
					block("สำนักงานแจ้งผลการพิจารณาให้ผู้ร้องเรียนทราบ"),
				],
				required_documents_guidance: [block("สำเนาบัตรประจำตัวประชาชน และหลักฐานประกอบ (ถ้ามี)")],
				contact_location_guidance: [
					block("งานบริหารทั่วไป สำนักงานสาธารณสุขอำเภอสอง วันจันทร์–ศุกร์ 08.30–16.30 น."),
				],
				duration: "แจ้งผลภายใน 15 วันทำการ",
				fees: "ไม่มีค่าธรรมเนียม",
				notes: "สำนักงานเก็บข้อมูลผู้ร้องเรียนเป็นความลับ",
			},
			references: { documents: [document.entryId!] },
		},
		{
			key: "feedback",
			title: "[ตัวอย่าง] เสนอแนะ / แสดงความคิดเห็น",
			category: complaints,
			data: {
				summary: "เสนอแนะเพื่อพัฒนาการให้บริการของสำนักงาน",
				ownership_type: "direct",
			},
		},
		{
			key: "environment",
			title: "[ตัวอย่าง] แจ้งปัญหาสิ่งแวดล้อมที่กระทบสุขภาพ",
			category: reports,
			data: {
				summary: "แจ้งเหตุรำคาญ กลิ่น ควัน น้ำเสีย หรือขยะที่กระทบสุขภาพของชุมชน",
				ownership_type: "coordinated",
				provider_text: "องค์กรปกครองส่วนท้องถิ่นในพื้นที่",
			},
		},
		{
			key: "vaccine",
			title: "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ่ประจำปี",
			category: reports,
			data: {
				summary: "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที่หน่วยบริการสุขภาพที่เกี่ยวข้อง",
				ownership_type: "related_health_service",
				channels: [{ label: "ติดต่อหน่วยบริการสุขภาพที่ให้บริการด้วยตนเอง" }],
			},
		},
		{
			key: "rights",
			title: "[ตัวอย่าง] ตรวจสอบสิทธิหลักประกันสุขภาพ",
			category: requests,
			data: {
				summary: "ตรวจสอบสิทธิการรักษาพยาบาลของตนเองทางออนไลน์",
				ownership_type: "external_digital",
				provider_text: "สำนักงานหลักประกันสุขภาพแห่งชาติ",
				external_url: "https://www.nhso.go.th/",
			},
		},
		{
			key: "request",
			title: "[ตัวอย่าง] ขอข้อมูลหรือเอกสารจากสำนักงาน",
			category: requests,
			data: {
				summary: "ขอข้อมูลข่าวสารของราชการ โดยติดต่อสำนักงานด้วยตนเอง",
				ownership_type: "direct",
			},
		},
	];

	const slugs = new Map<string, string>();
	const ids = new Map<string, string>();
	for (const service of SERVICES) {
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "services", {
			slug,
			data: { title: service.title, ...service.data },
			taxonomies: { service_category: [service.category] },
			...("references" in service ? { references: service.references } : {}),
		});
		if (!entry.result.ok) throw new Error(`service: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		slugs.set(service.key, slug);
		ids.set(service.key, entry.entryId!);
	}

	const area = await term("area", "ตำบลบ้านกลาง");
	const clinic = await term("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const hospital = await term("facility_type", "โรงพยาบาลชุมชน");
	for (const healthService of [
		{
			title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง",
			displayName: "[ตัวอย่าง] รพ.สต.บ้านกลาง",
			type: clinic,
			status: "temporarily_closed",
			address: "45 หมู่ 3 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
		},
		{
			title: "[ตัวอย่าง] โรงพยาบาลสอง",
			displayName: undefined,
			type: hospital,
			status: "active",
			address: "123 หมู่ 1 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
		},
	]) {
		const entry = await helpers.createSyntheticEntry(admin, "health_services", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title: healthService.title,
				...(healthService.displayName ? { display_name: healthService.displayName } : {}),
				operational_status: healthService.status,
				address: healthService.address,
			},
			taxonomies: { facility_type: [healthService.type], area: [area] },
			references: { offered_services: [ids.get("vaccine")!] },
		});
		if (!entry.result.ok)
			throw new Error(`health service: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "health_services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}

	return [
		"/services",
		{ name: "services-filtered", path: `/services?category=${complaints}` },
		{ name: "service-guidance", path: `/services/${slugs.get("complaint")}` },
		{ name: "service-health-services", path: `/services/${slugs.get("vaccine")}` },
		{ name: "service-external", path: `/services/${slugs.get("rights")}` },
	];
};

export default fixtures;

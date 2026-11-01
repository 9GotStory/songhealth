// Screenshot content for the About section and Basic Pages (#60): the reserved Basic Pages `about`,
// `organization`, `privacy` and `accessibility`, and published Documents of the Document Types
// `policy` and `plan`, none of `result`. Captures /about, /about/organization, the three About
// Document pages and the privacy page, whose footer shows both Basic Page links. A runtime that
// already holds a Basic Page at a reserved slug keeps it; the run stops instead.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, block }) => {
	const publish = async (collection: string, id: string) => {
		const published = await helpers.publishEntry(admin, collection, id);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	};
	const create = async (collection: string, slug: string, data: Record<string, unknown>) => {
		const entry = await helpers.createSyntheticEntry(admin, collection, { slug, data });
		if (!entry.result.ok) throw new Error(`${slug}: ${helpers.nativeRefusalOf(entry.result)}`);
		await publish(collection, entry.entryId!);
		return entry.entryId!;
	};
	const createDocument = async (title: string, type: string, fiscalYear: number) => {
		const file = await helpers.uploadSyntheticPdf(
			admin,
			`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-${type}.pdf`,
		);
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "documents", {
			slug,
			data: { title, file: file.value, fiscal_year: fiscalYear },
			taxonomies: { document_type: [type] },
		});
		if (!entry.result.ok) throw new Error(`document: ${helpers.nativeRefusalOf(entry.result)}`);
		await publish("documents", entry.entryId!);
		return entry.entryId!;
	};

	for (const slug of ["about", "organization", "privacy", "accessibility"]) {
		if ((await helpers.readEntry(admin, "pages", slug)).ok) {
			throw new Error(`the runtime holds a Basic Page at the reserved slug "${slug}"`);
		}
	}

	await createDocument(
		"[ตัวอย่าง] นโยบายการบริหารงานสำนักงานสาธารณสุขอำเภอสอง ปี 2569",
		"policy",
		2569,
	);
	const plan = await createDocument(
		"[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข อำเภอสอง ปีงบประมาณ 2570",
		"plan",
		2570,
	);
	await createDocument(
		"[ตัวอย่าง] นโยบายคุ้มครองข้อมูลส่วนบุคคลของสำนักงานสาธารณสุขอำเภอสอง",
		"policy",
		2570,
	);

	const about = await helpers.createSyntheticEntry(admin, "pages", {
		slug: "about",
		data: {
			title: "[ตัวอย่าง] เกี่ยวกับสำนักงานสาธารณสุขอำเภอสอง",
			summary:
				"สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่ ดูแลงานสาธารณสุขและประสานเครือข่ายบริการสุขภาพในอำเภอสอง",
			body: [
				block("หน้าที่และอำนาจ", "h2"),
				block(
					"ประสานงานและสนับสนุนการดำเนินงานด้านสาธารณสุขของโรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่ ส่งเสริมสุขภาพ ป้องกันและควบคุมโรค และคุ้มครองผู้บริโภคด้านสุขภาพ",
				),
				block("พื้นที่รับผิดชอบ", "h2"),
				block("ครอบคลุม 8 ตำบลของอำเภอสอง จังหวัดแพร่"),
			],
		},
		references: { documents: [plan] },
	});
	if (!about.result.ok) throw new Error(`about: ${helpers.nativeRefusalOf(about.result)}`);
	await publish("pages", about.entryId!);
	await create("pages", "organization", {
		title: "[ตัวอย่าง] โครงสร้างองค์กร",
		summary: "การแบ่งส่วนงานภายในของสำนักงานสาธารณสุขอำเภอสอง",
		body: [
			block("กลุ่มงานบริหารทั่วไป", "h2"),
			block("งานธุรการ การเงิน พัสดุ และบุคลากร"),
			block("กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค", "h2"),
			block("งานส่งเสริมสุขภาพทุกกลุ่มวัย งานควบคุมโรคติดต่อและโรคไม่ติดต่อ"),
		],
	});
	await create("pages", "privacy", {
		title: "[ตัวอย่าง] นโยบายความเป็นส่วนตัว",
		body: [block("เว็บไซต์นี้ไม่ใช้คุกกี้ติดตามและไม่ส่งข้อมูลการเข้าชมให้บุคคลภายนอก")],
	});
	await create("pages", "accessibility", {
		title: "[ตัวอย่าง] การเข้าถึงเว็บไซต์",
		body: [block("เว็บไซต์นี้ออกแบบให้สอดคล้องกับ WCAG 2.2 ระดับ AA")],
	});

	return [
		"/about",
		"/about/organization",
		"/about/policies",
		"/about/plans",
		"/about/results",
		"/pages/privacy",
	];
};

export default fixtures;

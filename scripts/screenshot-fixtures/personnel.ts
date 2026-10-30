// Screenshot content for the Leadership and Personnel pages (#61): two Leadership with pictures and
// public contacts, staff in three units, one person without a unit, and one hidden person who must
// not appear. Captures /about/leadership and /about/personnel.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const create = async (data: Record<string, unknown>) => {
		const entry = await helpers.createSyntheticEntry(admin, "personnel", {
			slug: helpers.syntheticSlug("shot"),
			data: { public_visible: true, ...data },
		});
		if (!entry.result.ok) throw new Error(`personnel: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "personnel", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	};
	const portrait = async (name: string, from: string, to: string) => ({
		id: await picture(`ภาพ ${name}`, from, to),
	});

	const administration = "กลุ่มงานบริหารทั่วไป";
	const prevention = "กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค";
	const consumer = "กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข";

	await create({
		title: "[ตัวอย่าง] สมชาย ใจดี",
		prefix: "นาย",
		current_assignment: "สาธารณสุขอำเภอสอง",
		organizational_unit: administration,
		profile_image: await portrait("สมชาย", "#bae0cf", "#0b6b57"),
		public_contact: "โทร 000-000-0000 ต่อ 101\nอีเมล director@example.org",
		leadership_order: 1,
	});
	await create({
		title: "[ตัวอย่าง] วิภาวดี แสงทอง",
		prefix: "นาง",
		current_assignment: "ผู้ช่วยสาธารณสุขอำเภอสอง",
		organizational_unit: prevention,
		profile_image: await portrait("วิภาวดี", "#f2d17a", "#bfdcce"),
		public_contact: "โทร 000-000-0000 ต่อ 102",
		leadership_order: 2,
	});
	await create({
		title: "[ตัวอย่าง] กาญจนา มีสุข",
		prefix: "นางสาว",
		current_assignment: "นักจัดการงานทั่วไป",
		organizational_unit: administration,
	});
	await create({
		title: "[ตัวอย่าง] ธนพล รักษ์ดี",
		prefix: "นาย",
		current_assignment: "นักวิชาการสาธารณสุขชำนาญการ",
		organizational_unit: prevention,
		profile_image: await portrait("ธนพล", "#d1ebde", "#123c33"),
	});
	await create({
		title: "[ตัวอย่าง] เกศินี วงศ์ใหญ่",
		prefix: "นาง",
		current_assignment: "เภสัชกรชำนาญการ",
		organizational_unit: consumer,
		public_contact: "โทร 000-000-0000 ต่อ 120",
	});
	await create({
		title: "[ตัวอย่าง] อนุชา ทองคำ",
		prefix: "นาย",
		current_assignment: "เจ้าพนักงานธุรการ",
	});
	await create({
		title: "[ตัวอย่าง] บุคลากรที่ไม่แสดงต่อสาธารณะ",
		organizational_unit: administration,
		public_visible: false,
		leadership_order: 3,
	});

	return ["/about/leadership", "/about/personnel"];
};

export default fixtures;

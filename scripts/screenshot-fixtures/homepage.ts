// Screenshot content for the Homepage (#64, #65): two published News, the newer with a category and
// summary; three current Announcements and a closed one; four Health Content items with their
// Health Topics; two Health Services in two Areas; three Activities, two with a picture; and a full
// Office Contact. The curated sections take a Featured News with a picture, which the News card
// then leaves out; six Services of the `00` §8.2 catalog; and the Quick Access shortcuts the frame
// keeps, Documents and Health Information (docs/design/homepage-concept-v1.md §10). Captures /.

import type { Fixtures } from "../capture-with-fixtures.ts";

const DAY = 24 * 60 * 60 * 1000;

const fixtures: Fixtures = async ({
	admin,
	helpers,
	term,
	picture,
	officeContact,
	homepageMenus,
}) => {
	/** Create an entry of `collection` with a synthetic slug, publish it and return its id. */
	const published = async (
		collection: string,
		data: Record<string, unknown>,
		taxonomies?: Record<string, string[]>,
	) => {
		const created = await helpers.createSyntheticEntry(admin, collection, {
			slug: helpers.syntheticSlug("shot"),
			data,
			...(taxonomies ? { taxonomies } : {}),
		});
		if (!created.result.ok) {
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const done = await helpers.publishEntry(admin, collection, created.entryId!);
		if (!done.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(done)}`);
		return created.entryId!;
	};

	const featured = {
		title:
			"[ตัวอย่าง] ชวนประชาชนอายุ 35 ปีขึ้นไปตรวจคัดกรองเบาหวานและความดันโลหิตฟรี ตลอดเดือนพฤศจิกายน",
		summary:
			"รพ.สต. ทุกแห่งในอำเภอสองเปิดจุดตรวจคัดกรองในวันและเวลาราชการ ไม่ต้องนัดล่วงหน้า นำบัตรประจำตัวประชาชนมาด้วย",
	};
	const featuredId = await published("news", {
		...featured,
		featured_image: { id: await picture(`ภาพประกอบ ${featured.title}`, "#f0f5fc", "#0b6b57") },
	});

	await published("news", {
		title: "[ตัวอย่าง] สาธารณสุขอำเภอสองจัดประชุมเตรียมรับมือโรคติดต่อช่วงฤดูหนาว",
		summary: "ทบทวนแผนเฝ้าระวังโรคไข้หวัดใหญ่และโรคติดเชื้อทางเดินหายใจร่วมกับ รพ.สต. ทุกแห่ง",
	});
	await published(
		"news",
		{
			title: "[ตัวอย่าง] อำเภอสองรณรงค์กำจัดแหล่งเพาะพันธุ์ยุงลาย ลดไข้เลือดออกในชุมชน",
			summary:
				"อสม. และเจ้าหน้าที่ รพ.สต. ร่วมกับผู้นำชุมชนลงพื้นที่สำรวจลูกน้ำยุงลายทุกหลังคาเรือน พร้อมให้ความรู้การป้องกันโรคแก่ประชาชน",
		},
		{ news_category: [await term("news_category", "ข่าวประชาสัมพันธ์")] },
	);

	const now = Date.now();
	const recruit = await term("announcement_type", "รับสมัคร");
	const notice = await term("announcement_type", "ประชาสัมพันธ์");
	for (const [title, type, daysAgo, closesIn] of [
		["[ตัวอย่าง] รับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน ประจำปี 2570", recruit, 2, 14],
		[
			"[ตัวอย่าง] งดให้บริการคลินิกทันตกรรมชั่วคราว เนื่องจากปรับปรุงห้องตรวจ",
			notice,
			5,
			undefined,
		],
		["[ตัวอย่าง] เชิญชวนผู้สูงอายุรับวัคซีนไข้หวัดใหญ่ฟรี ที่ รพ.สต. ใกล้บ้าน", notice, 9, 30],
		["[ตัวอย่าง] รับสมัครผู้เข้าร่วมโครงการเลิกบุหรี่ รุ่นที่ 1/2569 (ปิดแล้ว)", recruit, 1, -3],
	] as const) {
		await published(
			"announcements",
			{
				title,
				announcement_at: new Date(now - daysAgo * DAY).toISOString(),
				...(closesIn === undefined
					? {}
					: { closes_at: new Date(now + closesIn * DAY).toISOString() }),
			},
			{ announcement_type: [type] },
		);
	}

	for (const [title, summary, topic] of [
		[
			"[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใครควรได้รับ",
			"ผู้สูงอายุ ผู้มีโรคเรื้อรัง และหญิงตั้งครรภ์ควรรับวัคซีนปีละครั้ง",
			"วัคซีนและการสร้างเสริมภูมิคุ้มกัน",
		],
		[
			"[ตัวอย่าง] ป้องกันการหกล้มในผู้สูงอายุ",
			"จัดบ้านให้ปลอดภัย เพิ่มแสงสว่าง และออกกำลังกายเสริมการทรงตัว",
			"ผู้สูงอายุ",
		],
		[
			"[ตัวอย่าง] กินอย่างไรให้ห่างไกลเบาหวาน",
			"ลดหวาน มัน เค็ม เพิ่มผักผลไม้ และออกกำลังกายสม่ำเสมอ",
			"โรคไม่ติดต่อเรื้อรัง",
		],
		[
			"[ตัวอย่าง] 3 เก็บ ป้องกัน 3 โรค",
			"เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวงจรยุงลาย ป้องกันไข้เลือดออก",
			"ไข้เลือดออก",
		],
	] as const) {
		await published("health_content", { title, summary }, { topic: [await term("topic", topic)] });
	}

	for (const [title, area] of [
		["[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง", "ตำบลบ้านกลาง"],
		["[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลสะเอียบ", "ตำบลสะเอียบ"],
	] as const) {
		await published("health_services", { title }, { area: [await term("area", area)] });
	}

	for (const [title, daysAgo, colours] of [
		["[ตัวอย่าง] ลงพื้นที่คัดกรองผู้สูงอายุ ตำบลบ้านกลาง", 3, ["#bfdcce", "#e8f0d9"]],
		[
			"[ตัวอย่าง] ประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอ ครั้งที่ 3/2569",
			8,
			["#d1ebde", "#f2d17a"],
		],
		["[ตัวอย่าง] อบรมฟื้นฟูความรู้ อสม. ด้านการป้องกันโรคติดต่อ", 15, undefined],
	] as const) {
		await published("activities", {
			title,
			activity_at: new Date(now - daysAgo * DAY).toISOString(),
			...(colours
				? { featured_image: { id: await picture(`ภาพประกอบ ${title}`, colours[0], colours[1]) } }
				: {}),
		});
	}

	const services = [];
	for (const [title, summary] of [
		[
			"[ตัวอย่าง] ร้องเรียนการปฏิบัติงานหรือการให้บริการ",
			"แจ้งเรื่องที่ไม่ได้รับความสะดวกหรือไม่เป็นธรรมจากการปฏิบัติงานของเจ้าหน้าที่",
		],
		["[ตัวอย่าง] เสนอแนะ / แสดงความคิดเห็น", "เสนอแนะเพื่อพัฒนาการให้บริการของสำนักงาน"],
		[
			"[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ",
			"แจ้งปัญหาสุขภาพในชุมชน เพื่อให้เจ้าหน้าที่ติดตามและประสานการดูแล",
		],
		[
			"[ตัวอย่าง] ขอข้อมูลหรือเอกสารจากสำนักงาน",
			"ขั้นตอนและช่องทางการขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการ",
		],
		[
			"[ตัวอย่าง] บริการสำหรับ อสม.",
			"ข้อมูล แบบฟอร์ม และช่องทางติดต่อสำหรับอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
		],
		["[ตัวอย่าง] สอบถามข้อมูลทั่วไป", "ช่องทางสอบถามข้อมูลบริการและการติดต่อสำนักงาน"],
	] as const) {
		services.push({ title, id: await published("services", { title, summary }) });
	}

	await homepageMenus({
		featured: [helpers.pickedMenuItem("news", { id: featuredId, title: featured.title })],
		services: services.map((service) => helpers.pickedMenuItem("services", service)),
		quickAccess: [
			{ label: "เอกสารเผยแพร่", url: "/documents" },
			{ label: "ข้อมูลสุขภาพ", url: "/health" },
		],
	});

	await officeContact(
		{
			address: "[ตัวอย่าง] 99 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120",
			telephone: "054 591 234",
			email: "contact@example.invalid",
			opening_hours: "จันทร์–ศุกร์ 08:30–16:30 น.\nเว้นวันหยุดราชการ",
			latitude: 18.4686,
			longitude: 100.1834,
		},
		{},
	);
	return ["/"];
};

export default fixtures;

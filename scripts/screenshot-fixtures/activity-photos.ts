// Screenshot content for an Activity's photos (#148; spec #144 "An Activity's photos (its gallery
// field)"): an Activity with a portrait A4 stand-in for its One Page, its details and twenty
// captioned landscape photos, one of whose captions runs past two lines. Captures its page as
// activity-photos, and again with all its photos open, as activity-photos-open.

import type { Fixtures } from "../capture-with-fixtures.ts";

/** The colours the photos blend, the site's own tokens. */
const COLOURS = ["#0b6b57", "#123c33", "#bae0cf", "#d1ebde", "#e8f0d9", "#f2d17a", "#bfdcce"];

const CAPTIONS = [
	"ลงทะเบียนผู้เข้าอบรมที่หอประชุมอำเภอสอง",
	"สาธารณสุขอำเภอสองกล่าวเปิดการอบรม",
	"บรรยายการคัดกรองเบาหวานและความดันโลหิตสูงในชุมชน",
	"ฝึกวัดความดันโลหิตด้วยเครื่องวัดแบบดิจิทัล",
	"ฝึกตรวจระดับน้ำตาลจากปลายนิ้ว",
	"แบ่งกลุ่มฝึกบันทึกผลการคัดกรอง",
	"บรรยายการป้องกันโรคไข้เลือดออกและการสำรวจลูกน้ำยุงลาย",
	"สาธิตการใส่ทรายกำจัดลูกน้ำในภาชนะเก็บน้ำ",
	"ฝึกปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพ",
	"ฝึกใช้เครื่องกระตุกหัวใจไฟฟ้าอัตโนมัติ",
	"บรรยายการดูแลผู้สูงอายุและการป้องกันการหกล้ม",
	"สาธิตการออกกำลังกายสำหรับผู้สูงอายุ",
	"ฝึกใช้แบบคัดกรองภาวะสมองเสื่อม",
	"บรรยายการคุ้มครองผู้บริโภคด้านสุขภาพ",
	"อสม. ตำบลบ้านหนุนนำเสนอผลงานของกลุ่ม",
	"อสม. ตำบลสะเอียบนำเสนอผลงานของกลุ่ม",
	"ทดสอบความรู้หลังการอบรม",
	"มอบเกียรติบัตรแก่ อสม. ดีเด่นระดับอำเภอ ประจำปี 2569 ผู้ปฏิบัติงานเฝ้าระวังและป้องกันโรคในชุมชนอย่างต่อเนื่องตลอดทั้งปี",
	"ผู้เข้าอบรมร่วมกันทำความสะอาดหอประชุม",
	"ถ่ายภาพร่วมกันหลังการอบรม",
];

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const title = "[ตัวอย่าง] อบรมฟื้นฟูความรู้อาสาสมัครสาธารณสุขประจำหมู่บ้าน อำเภอสอง ประจำปี 2569";
	const gallery = [];
	for (const [index, caption] of CAPTIONS.entries()) {
		const from = COLOURS[index % COLOURS.length]!;
		const to = COLOURS[(index * 3 + 1) % COLOURS.length]!;
		gallery.push({ image: { id: await picture(caption, from, to) }, caption });
	}
	const slug = helpers.syntheticSlug("shot");
	const created = await helpers.createSyntheticEntry(admin, "activities", {
		slug,
		data: {
			title,
			summary:
				"อสม. 120 คนจากทุกตำบลฟื้นฟูความรู้การคัดกรองโรคไม่ติดต่อเรื้อรัง การป้องกันไข้เลือดออก และการดูแลผู้สูงอายุ",
			activity_at: "2026-10-21T02:00:00.000Z",
			location_text: "หอประชุมอำเภอสอง",
			participants_text: "อาสาสมัครสาธารณสุขประจำหมู่บ้าน 120 คน\nเจ้าหน้าที่ รพ.สต. ทุกแห่ง",
			featured_image: {
				id: await picture(`ภาพ One Page ${title}`, "#0b6b57", "#e8f0d9", helpers.ONE_PAGE_SIZE),
			},
			gallery,
		},
	});
	if (!created.result.ok) {
		throw new Error(`activities: ${helpers.nativeRefusalOf(created.result)}`);
	}
	const published = await helpers.publishEntry(admin, "activities", created.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);

	return [
		{ name: "activity-photos", path: `/activities/${slug}` },
		{ name: "activity-photos-open", path: `/activities/${slug}!ดูรูปทั้งหมด (20 รูป)` },
	];
};

export default fixtures;

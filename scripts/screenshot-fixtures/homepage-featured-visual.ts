// Screenshot content for the Featured card without a picture (#65; Feature 008 #241, spec #239
// "Hero and Featured"): a current Announcement as the Featured item, which shows the plain visual
// in the card's frame and "เรื่องเด่น" with its announcement date. Captures / as
// home-featured-visual.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, block, homepageMenus }) => {
	const title = "[ตัวอย่าง] รับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน ประจำปี 2570";
	const created = await helpers.createSyntheticEntry(admin, "announcements", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title,
			details: [
				block(
					"สำนักงานสาธารณสุขอำเภอสองเปิดรับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน ผู้สนใจสมัครได้ที่ รพ.สต. ทุกแห่งหรือที่สำนักงาน ในวันและเวลาราชการ จนถึงสิ้นเดือนพฤศจิกายน พร้อมสำเนาบัตรประจำตัวประชาชนและทะเบียนบ้าน",
				),
			],
		},
	});
	if (!created.result.ok) {
		throw new Error(`announcement: ${helpers.nativeRefusalOf(created.result)}`);
	}
	const done = await helpers.publishEntry(admin, "announcements", created.entryId!);
	if (!done.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(done)}`);
	await homepageMenus({
		featured: [helpers.pickedMenuItem("announcements", { id: created.entryId!, title })],
	});
	return [{ name: "home-featured-visual", path: "/" }];
};

export default fixtures;

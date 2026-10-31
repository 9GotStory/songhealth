// Screenshot content for the Featured hero without a picture (#65): a current Announcement as the
// Featured item, which shows the start of its details and the frame's visual with its caption
// (Product Owner, 2026-10-31: #65 comment 6538358352). Captures / as home-featured-visual.

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

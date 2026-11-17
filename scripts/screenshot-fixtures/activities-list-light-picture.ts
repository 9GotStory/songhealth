// Screenshot content for the contrast of the large card on the Activities list's first page
// (Feature 010 #313; spec #311 "The Activities list", "Accessibility"): the demo dataset's
// Activities with one Activity published last, so it leads as the large card, whose picture is
// white all over, whose title takes the card's three lines, whose summary its two and whose place
// its pill's one line: the least the gradient can have behind them. With ACTIVITY_PICTURE=none it
// has no picture, for the deep visual behind the same text. scripts/measure-text-contrast.ts reads
// it with --fixtures. Captures /activities at the five widths the feature's tickets name.
//
//   scripts/dev-runtime-env.sh node scripts/measure-text-contrast.ts \
//     --fixtures scripts/screenshot-fixtures/activities-list-light-picture.ts /activities \
//     <selector>...

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const plain = process.env.ACTIVITY_PICTURE === "none";
	const title =
		"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่งจัดกิจกรรมอบรมอาสาสมัครสาธารณสุขประจำหมู่บ้านเรื่องการดูแลผู้สูงอายุติดเตียงในชุมชนประจำปีงบประมาณ 2570";
	// Without an Activity date it is listed by its publication, now, after every demo Activity.
	const entry = await helpers.createSyntheticEntry(admin, "activities", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title,
			summary:
				"อาสาสมัครสาธารณสุขประจำหมู่บ้านจากทุกตำบลเข้ารับการอบรมการพลิกตัว การป้องกันแผลกดทับ และการจัดอาหารสำหรับผู้สูงอายุติดเตียง พร้อมฝึกปฏิบัติกับเจ้าหน้าที่ของโรงพยาบาลส่งเสริมสุขภาพตำบล",
			location_text:
				"ห้องประชุมใหญ่สำนักงานสาธารณสุขอำเภอสอง ชั้นสอง อาคารอเนกประสงค์ ข้างโรงพยาบาลสอง",
			...(plain
				? {}
				: { featured_image: { id: await picture(`ภาพประกอบ ${title}`, "#ffffff", "#ffffff") } }),
		},
	});
	if (!entry.result.ok) throw new Error(`activity: ${helpers.nativeRefusalOf(entry.result)}`);
	const published = await helpers.publishEntry(admin, "activities", entry.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `activities-list-${plain ? "plain" : "light-picture"}-${width}`,
		path: `/activities@${width}`,
	}));
};

export default fixtures;

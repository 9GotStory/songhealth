// Screenshot content for the Homepage's five Activities (Feature 008 #247; spec #239
// "Activities"): the demo dataset's Homepage with five Activities held in 2035, so they lead the
// section. The large tile and the first small one have a picture that is white all over and a
// title that takes both lines, the least the gradient can have behind a title, which
// scripts/measure-text-contrast.ts reads with --fixtures; the second small tile has no picture and
// shows the visual. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

/** Each Activity's title, the newest first, and whether it has the white picture. */
const ACTIVITIES = [
	{
		title:
			"[ตัวอย่าง] เดินรณรงค์ชุมชนปลอดลูกน้ำยุงลายร่วมกับอาสาสมัครสาธารณสุขและนักเรียนทุกหมู่บ้านในตำบลตัวอย่าง",
		white: true,
	},
	{
		title:
			"[ตัวอย่าง] อบรมเชิงปฏิบัติการปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพสำหรับแกนนำชุมชนรุ่นที่สอง",
		white: true,
	},
	{ title: "[ตัวอย่าง] ประชุมเครือข่ายสุขภาพตำบลตัวอย่างประจำไตรมาส", white: false },
	{ title: "[ตัวอย่าง] ตรวจสุขภาพผู้สูงอายุเชิงรุกในชุมชน", white: false },
	{ title: "[ตัวอย่าง] ออกหน่วยให้ความรู้เรื่องอาหารปลอดภัยที่ตลาดนัด", white: false },
];

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	for (const [index, { title, white }] of ACTIVITIES.entries()) {
		const entry = await helpers.createSyntheticEntry(admin, "activities", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title,
				activity_at: `2035-06-${String(20 - index).padStart(2, "0")}T03:00:00.000Z`,
				...(white
					? { featured_image: { id: await picture(`ภาพประกอบ ${title}`, "#ffffff", "#ffffff") } }
					: {}),
			},
		});
		if (!entry.result.ok) throw new Error(`activities: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "activities", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}
	return HOMEPAGE_WIDTHS.map((width) => ({ name: `home-activities-${width}`, path: `/@${width}` }));
};

export default fixtures;

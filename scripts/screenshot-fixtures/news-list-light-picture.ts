// Screenshot content for the contrast of the large card on the News list's first page (Feature 009
// #284; spec #280 "The cards"): the demo dataset's News with one News published last, whose picture
// is white all over, whose title takes the card's three lines and whose summary its two, with a
// category for its label: the least the gradient can have behind them. scripts/measure-text-
// contrast.ts reads it with --fixtures. Captures /news at the five widths the feature's tickets
// name.
//
//   scripts/dev-runtime-env.sh node scripts/measure-text-contrast.ts \
//     --fixtures scripts/screenshot-fixtures/news-list-light-picture.ts /news <selector>...

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture, term }) => {
	const title =
		"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลสองและโรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่งจัดกิจกรรมรณรงค์ตรวจคัดกรองสุขภาพประชาชนในพื้นที่อำเภอสองประจำปีงบประมาณ 2570";
	const entry = await helpers.createSyntheticEntry(admin, "news", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title,
			summary:
				"ขอเชิญประชาชนทุกช่วงวัยเข้ารับการตรวจคัดกรองความดันโลหิต เบาหวาน และสายตา โดยไม่มีค่าใช้จ่าย พร้อมรับคำแนะนำการดูแลสุขภาพจากเจ้าหน้าที่ สอบถามรายละเอียดเพิ่มเติมได้ที่สำนักงานในวันและเวลาราชการ",
			featured_image: { id: await picture(`ภาพประกอบ ${title}`, "#ffffff", "#ffffff") },
		},
		taxonomies: { news_category: [await term("news_category", "ประชาสัมพันธ์")] },
	});
	if (!entry.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(entry.result)}`);
	const published = await helpers.publishEntry(admin, "news", entry.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `news-list-light-picture-${width}`,
		path: `/news@${width}`,
	}));
};

export default fixtures;

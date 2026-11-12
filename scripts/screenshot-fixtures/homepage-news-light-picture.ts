// Screenshot content for the contrast of the large Latest News card's title (Feature 008 #244;
// spec #239 "Latest News"): the demo dataset's Homepage with one News published last, whose picture
// is white all over and whose title takes the card's three lines, the least the gradient can have
// behind the title. scripts/measure-text-contrast.ts reads it with --fixtures. Captures / at the
// five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const title =
		"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลสองและโรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่งจัดกิจกรรมรณรงค์ตรวจคัดกรองสุขภาพประชาชนในพื้นที่อำเภอสองประจำปีงบประมาณ 2570";
	const entry = await helpers.createSyntheticEntry(admin, "news", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title,
			featured_image: { id: await picture(`ภาพประกอบ ${title}`, "#ffffff", "#ffffff") },
		},
	});
	if (!entry.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(entry.result)}`);
	const published = await helpers.publishEntry(admin, "news", entry.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-news-light-picture-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;

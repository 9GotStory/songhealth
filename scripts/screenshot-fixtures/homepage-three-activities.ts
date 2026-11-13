// Screenshot content for the Homepage with three Activities (Feature 008 #247; spec #239
// "Activities", "the missing-content cases"): the demo dataset's Activities are returned to draft
// for the run and three take their place, so the tiles are equal and fill one row from 1,024 px,
// and the first spans the row below. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const TITLES = [
	"[ตัวอย่าง] เดินรณรงค์ชุมชนปลอดลูกน้ำยุงลาย",
	"[ตัวอย่าง] อบรมปฐมพยาบาลเบื้องต้นสำหรับแกนนำชุมชน",
	"[ตัวอย่าง] ประชุมเครือข่ายสุขภาพตำบลตัวอย่าง",
];

const fixtures: Fixtures = async ({ admin, helpers, borrow, picture }) => {
	await borrow("activities");
	for (const [index, title] of TITLES.entries()) {
		const entry = await helpers.createSyntheticEntry(admin, "activities", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title,
				activity_at: `2035-06-${String(20 - index).padStart(2, "0")}T03:00:00.000Z`,
				...(index === 0
					? { featured_image: { id: await picture(`ภาพประกอบ ${title}`, "#bfdcce", "#0b6b57") } }
					: {}),
			},
		});
		if (!entry.result.ok) throw new Error(`activities: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "activities", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-three-activities-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;

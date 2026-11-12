// Screenshot content for the Homepage's Current Announcements (Feature 008 #245; spec #239
// "Current Announcements"): the demo dataset's Homepage with four Announcements announced after
// the dataset's, so the four rows show each category colour and the status line: a procurement
// one that is open, a recruitment one that is not open yet, with a title longer than two lines, one
// in the general category without dates, and one in a category added later. The demo dataset's own
// Announcements have no open or close dates. Captures / at the five widths the feature's tickets
// name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const added = await term("announcement_type", "[ตัวอย่าง] รับฟังความคิดเห็น");
	// Announced in this order, so the last is the newest and takes the first row.
	for (const { title, type, ...dates } of [
		{
			title: "[ตัวอย่าง] เชิญร่วมแสดงความคิดเห็นต่อร่างแผนสุขภาพอำเภอสอง",
			type: added,
			announcement_at: "2036-01-04T03:00:00.000Z",
		},
		{
			title: "[ตัวอย่าง] แจ้งปิดปรับปรุงอาคารสำนักงานชั่วคราว",
			type: "general",
			announcement_at: "2036-01-11T03:00:00.000Z",
		},
		{
			title:
				"[ตัวอย่าง] รับสมัครอาสาสมัครตัวอย่างเพื่อช่วยงานรณรงค์สุขภาพในชุมชน ร่วมออกหน่วยให้ความรู้ทุกตำบลของอำเภอ ตลอดปีงบประมาณ 2579",
			type: "recruitment",
			announcement_at: "2036-01-24T03:00:00.000Z",
			opens_at: "2036-06-01T03:00:00.000Z",
			closes_at: "2036-06-30T03:00:00.000Z",
		},
		{
			title: "[ตัวอย่าง] ประกวดราคาจัดซื้อครุภัณฑ์สำนักงานตัวอย่าง",
			type: "procurement",
			announcement_at: "2036-01-30T03:00:00.000Z",
			opens_at: "2026-01-05T03:00:00.000Z",
			closes_at: "2036-03-31T03:00:00.000Z",
		},
	]) {
		const entry = await helpers.createSyntheticEntry(admin, "announcements", {
			slug: helpers.syntheticSlug("shot"),
			data: { title, ...dates },
			taxonomies: { announcement_type: [type] },
		});
		if (!entry.result.ok) throw new Error(`announcement: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "announcements", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-announcements-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;

// Screenshot content for the Homepage's Latest News (Feature 008 #244; spec #239 "Latest News"):
// the demo dataset's Homepage with two News without a picture published last, so the large card
// shows its deep green visual and the first small card the plain visual, before the dataset's News
// with their pictures. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];

const fixtures: Fixtures = async ({ admin, helpers }) => {
	// The second is published last, so it is the newest and takes the large card.
	for (const title of [
		"[ตัวอย่าง] เชิญชวนประชาชนร่วมกิจกรรมเดินวิ่งเพื่อสุขภาพ อำเภอสอง ประจำปี 2569",
		"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองเปิดรับฟังความคิดเห็นต่อแผนพัฒนาสุขภาพระดับอำเภอ",
	]) {
		const entry = await helpers.createSyntheticEntry(admin, "news", {
			slug: helpers.syntheticSlug("shot"),
			data: { title },
		});
		if (!entry.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "news", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}
	return WIDTHS.map((width) => ({ name: `home-news-no-picture-${width}`, path: `/@${width}` }));
};

export default fixtures;

// Screenshot content for the Homepage's Leadership strip (Feature 008 #243; spec #239 "Leadership
// strip"): the demo dataset's Homepage with a third Leadership, who has no picture, after the
// dataset's two, so the strip shows three people and the plain visual. Captures / at the five
// widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];

const fixtures: Fixtures = async ({ admin, helpers }) => {
	const entry = await helpers.createSyntheticEntry(admin, "personnel", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title: "[ตัวอย่าง] ธนพล รักษ์ดี",
			prefix: "นาย",
			current_assignment: "ผู้ช่วยสาธารณสุขอำเภอสอง",
			public_visible: true,
			leadership_order: 99,
		},
	});
	if (!entry.result.ok) throw new Error(`personnel: ${helpers.nativeRefusalOf(entry.result)}`);
	const published = await helpers.publishEntry(admin, "personnel", entry.entryId!);
	if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	return WIDTHS.map((width) => ({ name: `home-leadership-three-${width}`, path: `/@${width}` }));
};

export default fixtures;

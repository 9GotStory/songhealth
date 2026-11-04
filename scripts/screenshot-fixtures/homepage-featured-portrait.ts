// Screenshot content for the Featured hero with a portrait picture (#146): a News whose picture is
// a portrait A4 stand-in for a One Page, shown whole at the frame's height, narrower and centred on
// the band (spec #144 "Homepage (`04`)"). Its title holds "ความดันโลหิตสูง", the longest word a
// title keeps whole. Captures / as home-featured-portrait, and the hero at 1024 px, where lg's text
// column is narrowest, as hero-1024.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture, homepageMenus }) => {
	const title = "[ตัวอย่าง] ตรวจคัดกรองความดันโลหิตสูงและเบาหวานฟรี ที่ รพ.สต. ทุกแห่งในอำเภอสอง";
	const created = await helpers.createSyntheticEntry(admin, "news", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title,
			summary:
				"ประชาชนอายุ 35 ปีขึ้นไปตรวจวัดความดันโลหิตและระดับน้ำตาลในเลือดได้ฟรีในวันและเวลาราชการ",
			featured_image: {
				id: await picture(`ภาพ One Page ${title}`, "#123c33", "#bae0cf", helpers.ONE_PAGE_SIZE),
			},
		},
	});
	if (!created.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(created.result)}`);
	const done = await helpers.publishEntry(admin, "news", created.entryId!);
	if (!done.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(done)}`);
	await homepageMenus({
		featured: [helpers.pickedMenuItem("news", { id: created.entryId!, title })],
	});
	return [
		{ name: "home-featured-portrait", path: "/" },
		{ name: "hero-1024", path: "/@1024>section[aria-labelledby=home-featured]" },
	];
};

export default fixtures;

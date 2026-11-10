// Screenshot content for News and Health Content posts with no body, source or topics (#198; spec
// #190 "Empty trailing content on News/Health Content Post pages"): a News item with a landscape
// picture shorter than its header, where the empty row showed from lg; a News item with a portrait
// One Page taller than its header; and a Health Content item without a picture, with its review
// date. Captures each post page whole at the capture script's widths, and the landscape News post
// at 1024 px, where lg's two columns are narrowest, as news-landscape-1024.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const publish = async (collection: string, slug: string, data: Record<string, unknown>) => {
		const created = await helpers.createSyntheticEntry(admin, collection, { slug, data });
		if (!created.result.ok) {
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const published = await helpers.publishEntry(admin, collection, created.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	};

	const landscapeTitle = "[ตัวอย่าง] อำเภอสองเชิญชวนประชาชนรับวัคซีนไข้หวัดใหญ่ตามฤดูกาล ปี 2569";
	const landscapeSlug = helpers.syntheticSlug("shot");
	await publish("news", landscapeSlug, {
		title: landscapeTitle,
		summary:
			"ผู้สูงอายุ 65 ปีขึ้นไป ผู้มีโรคเรื้อรัง หญิงตั้งครรภ์ และเด็กเล็ก รับวัคซีนได้ที่ รพ.สต. ทุกแห่งในอำเภอสอง ตั้งแต่วันที่ 1 ถึง 30 พฤศจิกายน 2569\nนำบัตรประชาชนมาด้วย และแจ้งเจ้าหน้าที่หากเคยแพ้วัคซีน\nสอบถามวันและเวลาให้บริการได้ที่ รพ.สต. ใกล้บ้าน",
		featured_image: {
			id: await picture(`ภาพประกอบ ${landscapeTitle}`, "#123c33", "#bae0cf", {
				width: 1200,
				height: 600,
			}),
		},
	});

	const onePageTitle = "[ตัวอย่าง] สรุปผลการดำเนินงานคลินิกเลิกบุหรี่ ไตรมาสที่ 3";
	const onePageSlug = helpers.syntheticSlug("shot");
	await publish("news", onePageSlug, {
		title: onePageTitle,
		summary:
			"ผู้เข้ารับบริการ 86 คน เลิกบุหรี่ได้ต่อเนื่อง 3 เดือน 21 คน รายละเอียดอยู่ใน One Page",
		featured_image: {
			id: await picture(
				`ภาพ One Page ${onePageTitle}`,
				"#0b6b57",
				"#e8f0d9",
				helpers.ONE_PAGE_SIZE,
			),
		},
	});

	const contentTitle = "[ตัวอย่าง] ล้างมือ 7 ขั้นตอน ลดการแพร่เชื้อโรค";
	const contentSlug = helpers.syntheticSlug("shot");
	await publish("health_content", contentSlug, {
		title: contentTitle,
		summary: "ล้างมือด้วยสบู่และน้ำสะอาดอย่างน้อย 20 วินาที ก่อนรับประทานอาหารและหลังเข้าห้องน้ำ",
		reviewed_at: "2026-09-15T03:00:00.000Z",
	});

	return [
		{ name: "news-landscape", path: `/news/${landscapeSlug}` },
		{ name: "news-one-page", path: `/news/${onePageSlug}` },
		{ name: "health-content-plain", path: `/health/content/${contentSlug}` },
		{ name: "news-landscape-1024", path: `/news/${landscapeSlug}@1024` },
	];
};

export default fixtures;

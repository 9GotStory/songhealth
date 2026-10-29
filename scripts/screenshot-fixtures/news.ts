// Screenshot content for the News pages (#54): three published News, two with a Health Topic, all
// with a picture, category, summary and body. Captures /news, /news/health and one News page.

import type { Fixtures } from "../capture-with-fixtures.ts";

const NEWS = [
	{
		title: "[ตัวอย่าง] ประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอ ครั้งที่ 3/2569",
		summary:
			"สำนักงานสาธารณสุขอำเภอสองร่วมประชุมคณะกรรมการ พชอ. เพื่อติดตามแผนงานด้านสุขภาพของอำเภอ",
		category: "กิจกรรมหน่วยงาน",
		topic: undefined,
		from: "#bfdcce",
		to: "#e8f0d9",
	},
	{
		title: "[ตัวอย่าง] รณรงค์ป้องกันโรคไข้เลือดออกช่วงฤดูฝน",
		summary: "ชวนทุกครัวเรือนกำจัดแหล่งเพาะพันธุ์ยุงลายด้วยหลัก 3 เก็บ ป้องกัน 3 โรค",
		category: "ประชาสัมพันธ์",
		topic: "ไข้เลือดออก",
		from: "#bae0cf",
		to: "#f2d17a",
	},
	{
		title: "[ตัวอย่าง] เปิดให้บริการฉีดวัคซีนไข้หวัดใหญ่สำหรับกลุ่มเสี่ยง ประจำปี 2569",
		summary:
			"ผู้สูงอายุ ผู้มีโรคเรื้อรัง และหญิงตั้งครรภ์ รับวัคซีนได้ที่โรงพยาบาลส่งเสริมสุขภาพตำบลใกล้บ้าน",
		category: "ประชาสัมพันธ์",
		topic: "วัคซีนและการสร้างเสริมภูมิคุ้มกัน",
		from: "#d1ebde",
		to: "#e8f0cc",
	},
];

const fixtures: Fixtures = async ({ admin, helpers, term, picture, block }) => {
	const terms = new Map<string, string>();
	const termOf = async (taxonomy: string, label: string) => {
		const key = `${taxonomy}:${label}`;
		if (!terms.has(key)) terms.set(key, await term(taxonomy, label));
		return terms.get(key)!;
	};
	let lastSlug = "";
	for (const news of NEWS) {
		const slug = helpers.syntheticSlug("shot");
		const created = await helpers.createSyntheticEntry(admin, "news", {
			slug,
			data: {
				title: news.title,
				summary: news.summary,
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				featured_image: { id: await picture(`ภาพประกอบ ${news.title}`, news.from, news.to) },
				body: [
					block(news.summary),
					block("รายละเอียด", "h2"),
					block(
						"ประชาชนที่สนใจสอบถามข้อมูลเพิ่มเติมได้ที่สำนักงานสาธารณสุขอำเภอสอง ในวันและเวลาราชการ หรือโรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่",
					),
				],
			},
			taxonomies: {
				news_category: [await termOf("news_category", news.category)],
				...(news.topic ? { topic: [await termOf("topic", news.topic)] } : {}),
			},
		});
		if (!created.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(created.result)}`);
		const published = await helpers.publishEntry(admin, "news", created.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		lastSlug = slug;
	}
	return ["/news", "/news/health", { name: "news-item", path: `/news/${lastSlug}` }];
};

export default fixtures;

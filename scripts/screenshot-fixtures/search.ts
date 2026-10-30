// Screenshot content for Search (#63): published entries of several kinds about วัคซีน, one
// Announcement closed and one Document superseded, with the word in a title, a summary or only a
// body. Captures /search in each state: the start page, results, one group's results, a query too
// short, and a query that finds nothing.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WEEK = 7 * 24 * 60 * 60 * 1000;

const fixtures: Fixtures = async ({ admin, helpers, block }) => {
	const file = await helpers.uploadSyntheticPdf(admin);
	const entries: Array<[collection: string, data: Record<string, unknown>]> = [
		[
			"news",
			{
				title: "[ตัวอย่าง] รณรงค์ฉีดวัคซีนไข้หวัดใหญ่ให้ผู้สูงอายุในชุมชน",
				summary:
					"เจ้าหน้าที่ รพ.สต. ร่วมกับ อสม. ออกให้บริการฉีดวัคซีนถึงบ้านผู้สูงอายุและผู้ป่วยติดเตียง",
			},
		],
		[
			"services",
			{
				title: "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ่ประจำปี",
				summary: "บริการฉีดวัคซีนสำหรับกลุ่มเสี่ยงที่โรงพยาบาลและ รพ.สต. ทุกแห่งในอำเภอสอง",
			},
		],
		[
			"health_content",
			{
				title: "[ตัวอย่าง] วัคซีนที่ผู้สูงอายุควรได้รับ",
				summary: "ความรู้เรื่องวัคซีนไข้หวัดใหญ่ วัคซีนปอดอักเสบ และวัคซีนบาดทะยักสำหรับผู้สูงอายุ",
			},
		],
		[
			"announcements",
			{
				title: "[ตัวอย่าง] ประกาศตารางให้บริการวัคซีนเดือนตุลาคม",
				details: [block("รายละเอียดวันและสถานที่ให้บริการวัคซีนของแต่ละ รพ.สต.")],
				closes_at: new Date(Date.now() - WEEK).toISOString(),
			},
		],
		[
			"documents",
			{
				title: "[ตัวอย่าง] แนวทางการให้บริการวัคซีนในหน่วยบริการ",
				summary: "แนวทางปฏิบัติสำหรับเจ้าหน้าที่ในการให้บริการวัคซีน ฉบับปี 2568",
				file: file.value,
				domain_status: "superseded",
			},
		],
		[
			"news",
			{
				title: "[ตัวอย่าง] อำเภอสองจัดอบรม อสม. ประจำปี",
				summary: "อบรมฟื้นฟูความรู้อาสาสมัครสาธารณสุขประจำหมู่บ้าน",
				body: [
					block(
						"การอบรมครั้งนี้ครอบคลุมการคัดกรองโรคไม่ติดต่อเรื้อรัง การเยี่ยมบ้าน และการชวนผู้สูงอายุมารับวัคซีนตามนัด ผู้เข้าอบรมได้ฝึกปฏิบัติจริงในชุมชน",
					),
				],
			},
		],
	];
	for (const [collection, data] of entries) {
		const entry = await helpers.createSyntheticEntry(admin, collection, {
			slug: helpers.syntheticSlug("shot"),
			data,
		});
		if (!entry.result.ok)
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, collection, entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}
	const q = encodeURIComponent("วัคซีน");
	return [
		{ name: "search-start", path: "/search" },
		{ name: "search-results", path: `/search?q=${q}` },
		{ name: "search-group", path: `/search?q=${q}&group=news` },
		{ name: "search-too-short", path: `/search?q=${encodeURIComponent("ก")}` },
		{ name: "search-nothing", path: `/search?q=${encodeURIComponent("มาลาเรียขึ้นเขา")}` },
	];
};

export default fixtures;

// Screenshot content for the post pages (#147; spec #144 "Post pages: News, Activity and Health
// Content"): a News, an Activity and a Health Content item, each with a summary and a portrait A4
// stand-in for a One Page as its picture. The Activity has its details and six captioned photos;
// the News and the Health Content have a body, a source and a Health Topic. Captures the three post
// pages, and the News post at 1024 px, where lg's two columns are narrowest, as news-post-1024.

import type { SyntheticEntryResult } from "../../tests/browser/cms.helpers.ts";
import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ admin, helpers, term, picture, block }) => {
	const publish = async (collection: string, created: SyntheticEntryResult) => {
		if (!created.result.ok) {
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const published = await helpers.publishEntry(admin, collection, created.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	};
	const onePage = (title: string, from: string, to: string) =>
		picture(`ภาพ One Page ${title}`, from, to, helpers.ONE_PAGE_SIZE);

	const newsTitle =
		"[ตัวอย่าง] อำเภอสองรณรงค์ตรวจคัดกรองเบาหวานและความดันโลหิตสูงในผู้สูงอายุ ประจำปี 2569";
	const newsSlug = helpers.syntheticSlug("shot");
	await publish(
		"news",
		await helpers.createSyntheticEntry(admin, "news", {
			slug: newsSlug,
			data: {
				title: newsTitle,
				summary:
					"ทีมสาธารณสุขอำเภอสองร่วมกับ อสม. ตรวจคัดกรองผู้สูงอายุ 1,240 คนใน 8 ตำบล ผู้ที่มีความเสี่ยงได้รับนัดตรวจซ้ำที่ รพ.สต. ใกล้บ้าน",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				featured_image: { id: await onePage(newsTitle, "#123c33", "#bae0cf") },
				body: [
					block(
						"การตรวจคัดกรองครั้งนี้วัดความดันโลหิตและระดับน้ำตาลในเลือด พร้อมให้คำแนะนำเรื่องอาหารและการออกกำลังกายแก่ผู้สูงอายุและผู้ดูแล",
					),
					block("ผลการตรวจคัดกรอง", "h2"),
					block(
						"ผู้สูงอายุร้อยละ 18 มีความดันโลหิตสูงกว่าเกณฑ์ และร้อยละ 9 มีระดับน้ำตาลในเลือดสูง เจ้าหน้าที่ รพ.สต. จะติดตามทุกรายภายในหนึ่งเดือน",
					),
					block("ประชาชนที่ยังไม่ได้รับการตรวจ ติดต่อ รพ.สต. ในพื้นที่ได้ในวันและเวลาราชการ"),
				],
			},
			taxonomies: {
				news_category: [await term("news_category", "ประชาสัมพันธ์")],
				topic: [await term("topic", "โรคไม่ติดต่อเรื้อรัง")],
			},
		}),
	);

	const activityTitle =
		"[ตัวอย่าง] คณะกรรมการ พชอ. สอง ประชุมติดตามงานสุขภาพของอำเภอ ครั้งที่ 4/2569";
	const photos = [
		{ caption: "ผู้เข้าร่วมลงทะเบียนก่อนเริ่มการประชุม", colours: ["#bae0cf", "#f2d17a"] },
		{ caption: "นายอำเภอสองเปิดการประชุม", colours: ["#d1ebde", "#e8f0cc"] },
		{ caption: "นำเสนอสถานการณ์โรคไข้เลือดออกในพื้นที่", colours: ["#bfdcce", "#f2d17a"] },
		{
			caption: "ผู้อำนวยการ รพ.สต. รายงานผลการดูแลผู้สูงอายุติดเตียง",
			colours: ["#123c33", "#bae0cf"],
		},
		{ caption: "แบ่งกลุ่มวางแผนงานรายตำบล", colours: ["#e8f0d9", "#bfdcce"] },
		{ caption: "ถ่ายภาพร่วมกันหลังการประชุม", colours: ["#f2d17a", "#d1ebde"] },
	] as const;
	const gallery = [];
	for (const photo of photos) {
		gallery.push({
			image: { id: await picture(photo.caption, photo.colours[0], photo.colours[1]) },
			caption: photo.caption,
		});
	}
	const activitySlug = helpers.syntheticSlug("shot");
	await publish(
		"activities",
		await helpers.createSyntheticEntry(admin, "activities", {
			slug: activitySlug,
			data: {
				title: activityTitle,
				summary:
					"ติดตามแผนป้องกันโรคไข้เลือดออกและการดูแลผู้สูงอายุติดเตียง และมอบหมายให้ทุกตำบลรายงานผลภายในเดือนธันวาคม",
				activity_at: "2026-10-28T02:00:00.000Z",
				location_text: "ห้องประชุมที่ว่าการอำเภอสอง",
				participants_text:
					"นายอำเภอสอง หัวหน้าส่วนราชการ\nผู้อำนวยการ รพ.สต. ทุกแห่ง\nผู้นำชุมชนและ อสม. ตัวแทนตำบล",
				featured_image: { id: await onePage(activityTitle, "#0b6b57", "#e8f0d9") },
				gallery,
			},
		}),
	);

	const contentTitle = "[ตัวอย่าง] 3 เก็บ ป้องกัน 3 โรค ช่วงฤดูฝน";
	const contentSlug = helpers.syntheticSlug("shot");
	await publish(
		"health_content",
		await helpers.createSyntheticEntry(admin, "health_content", {
			slug: contentSlug,
			data: {
				title: contentTitle,
				summary:
					"เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวงจรยุงลาย ป้องกันไข้เลือดออก ไข้ซิกา และไข้ปวดข้อยุงลาย",
				source_text: "กรมควบคุมโรค กระทรวงสาธารณสุข",
				reviewed_at: "2026-09-15T03:00:00.000Z",
				featured_image: { id: await onePage(contentTitle, "#bae0cf", "#f2d17a") },
				body: [
					block("ยุงลายวางไข่ในน้ำนิ่งที่ใสในและรอบบ้าน การกำจัดแหล่งน้ำขังจึงตัดวงจรของยุงได้"),
					block("ข้อควรปฏิบัติ", "h2"),
					block(
						"หากมีไข้สูงเกินสองวัน โปรดปรึกษาเจ้าหน้าที่โรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่ หรือโทรสายด่วนกรมควบคุมโรค 1422",
					),
				],
			},
			taxonomies: { topic: [await term("topic", "ไข้เลือดออก")] },
		}),
	);

	return [
		{ name: "news-post", path: `/news/${newsSlug}` },
		{ name: "activity-post", path: `/activities/${activitySlug}` },
		{ name: "health-content-post", path: `/health/content/${contentSlug}` },
		{ name: "news-post-1024", path: `/news/${newsSlug}@1024` },
	];
};

export default fixtures;

// Latency content for /search (#63, ADR 0002), which reads every published entry of the
// searchable collections on each search: 1,000 published entries with the text real ones carry,
// 400 News and 200 Health Content with three-paragraph bodies, 300 Announcements with three
// paragraphs of details, and 100 Activities. Every entry mentions สาธารณสุข, half of them
// ไข้เลือดออก and a quarter ยุงลาย, so the paths time a search that matches everything, one with
// two terms, one that matches nothing, and a later page of one group.

import type { FixtureKit } from "../fixture-kit.ts";

export const paths = [
	`/search?q=${encodeURIComponent("สาธารณสุข")}`,
	`/search?q=${encodeURIComponent("ไข้เลือดออก ยุงลาย")}`,
	`/search?q=${encodeURIComponent("คำที่ไม่มีในเนื้อหา")}`,
	`/search?q=${encodeURIComponent("สาธารณสุข")}&group=health&page=5`,
];

/** Entries of each collection. */
const COUNTS = { news: 400, health_content: 200, announcements: 300, activities: 100 };
/** Requests in flight at once while the content is made. */
const PARALLEL = 8;

const SUMMARY =
	"สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลส่งเสริมสุขภาพตำบลให้ความรู้แก่ประชาชนเรื่องการดูแลสุขภาพในชุมชน";
const PARAGRAPH =
	"เจ้าหน้าที่ลงพื้นที่ร่วมกับอาสาสมัครสาธารณสุขประจำหมู่บ้าน ตรวจคัดกรองสุขภาพผู้สูงอายุ ให้คำแนะนำเรื่องอาหาร การออกกำลังกาย และการใช้ยาอย่างปลอดภัย ผู้สนใจติดต่อสอบถามได้ที่สำนักงานในวันและเวลาราชการ";
const DENGUE = "รณรงค์ป้องกันโรคไข้เลือดออกในฤดูฝน";
const MOSQUITO = "กำจัดแหล่งเพาะพันธุ์ยุงลายรอบบ้าน";

export default async function fixtures({ admin, helpers, block }: FixtureKit) {
	/** The text of entry `i`: everyone's, then ไข้เลือดออก for half and ยุงลาย for a quarter. */
	const textOf = (i: number) => [PARAGRAPH, i % 2 === 0 ? DENGUE : "", i % 4 === 0 ? MOSQUITO : ""];
	const make = async (collection: keyof typeof COUNTS, i: number) => {
		const [paragraph, dengue, mosquito] = textOf(i);
		const title = `${helpers.SYNTHETIC_FIXTURE_MARK} ${collection} วัดเวลาค้นหา ${i} ${dengue}`;
		const rich = [block(paragraph), block(`${dengue} ${mosquito}`), block(paragraph)];
		const data =
			collection === "announcements"
				? { title, details: rich }
				: collection === "activities"
					? {
							title,
							summary: SUMMARY,
							location_text: "ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง",
							participants_text: `อสม. เจ้าหน้าที่ รพ.สต. และประชาชน ${mosquito}`,
						}
					: { title, summary: SUMMARY, body: rich };
		const created = await helpers.createSyntheticEntry(admin, collection, { data });
		if (created.entryId === undefined) {
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const published = await helpers.publishEntry(admin, collection, created.entryId);
		if (!published.ok) throw new Error(`${collection}: ${helpers.nativeRefusalOf(published)}`);
	};
	const work = Object.entries(COUNTS).flatMap(([collection, count]) =>
		Array.from({ length: count }, (_, i) => () => make(collection as keyof typeof COUNTS, i)),
	);
	let next = 0;
	await Promise.all(
		Array.from({ length: PARALLEL }, async () => {
			while (next < work.length) await work[next++]();
		}),
	);
}

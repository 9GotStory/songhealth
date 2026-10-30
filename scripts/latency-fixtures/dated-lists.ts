// Latency content for the lists that sort every published entry in code (#56, ADR 0004): 1,000
// published Activities and 1,000 published Announcements, half of them without their own date,
// with pictures, a gallery, details and a type, as real ones carry. Publications are spread from
// 2022 to now. The Homepage reads both collections whole for its latest Activities and current
// Announcements (#64), so it is timed with them.

import type { FixtureKit } from "../fixture-kit.ts";

export const paths = [
	"/",
	"/activities",
	"/activities?page=42",
	"/announcements",
	"/announcements?page=25",
];

/** Entries of each collection. */
const COUNT = 1000;
/** Requests in flight at once while the content is made. */
const PARALLEL = 8;

const FROM = Date.UTC(2022, 0, 1);
const TO = Date.UTC(2027, 0, 1);
const between = (from: number, to: number) =>
	new Date(from + Math.random() * (to - from)).toISOString();

const SUMMARY =
	"สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลส่งเสริมสุขภาพตำบลจัดกิจกรรมรณรงค์ป้องกันโรคไข้เลือดออกในชุมชน พร้อมให้ความรู้แก่ประชาชนเรื่องการกำจัดแหล่งเพาะพันธุ์ยุงลาย";
const PARAGRAPH =
	"ผู้สนใจสามารถยื่นใบสมัครได้ที่สำนักงานสาธารณสุขอำเภอสองในวันและเวลาราชการ พร้อมสำเนาบัตรประจำตัวประชาชนและหลักฐานอื่นตามที่กำหนด หากมีข้อสงสัยโปรดติดต่อเจ้าหน้าที่";

export default async function fixtures({ admin, helpers, term, picture, block }: FixtureKit) {
	const image = { id: await picture("ภาพกิจกรรม", "#bfdcce", "#e8f0d9") };
	const type = await term("announcement_type", `${helpers.SYNTHETIC_FIXTURE_MARK} วัดเวลา`);
	const publish = async (collection: string, created: { result: unknown; entryId?: string }) => {
		if (created.entryId === undefined) throw new Error(`${collection}: not created`);
		const published = await helpers.publishEntry(admin, collection, created.entryId, {
			publishedAt: between(FROM, Date.now()),
		});
		if (!published.ok) throw new Error(`${collection}: ${helpers.nativeRefusalOf(published)}`);
	};
	const make = async (i: number) => {
		const activity = await helpers.createSyntheticEntry(admin, "activities", {
			data: {
				title: `${helpers.SYNTHETIC_FIXTURE_MARK} กิจกรรมวัดเวลา ${i}`,
				summary: SUMMARY,
				activity_at: i % 2 === 0 ? between(FROM, TO) : null,
				location_text: "ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง",
				participants_text: "อสม. เจ้าหน้าที่ รพ.สต. และประชาชนในพื้นที่",
				featured_image: image,
				gallery: [1, 2, 3, 4].map((n) => ({ image, caption: `ภาพกิจกรรมที่ ${n}` })),
			},
		});
		await publish("activities", activity);
		const announcement = await helpers.createSyntheticEntry(admin, "announcements", {
			data: {
				title: `${helpers.SYNTHETIC_FIXTURE_MARK} ประกาศวัดเวลา ${i}`,
				details: [block(PARAGRAPH), block(PARAGRAPH), block(PARAGRAPH)],
				announcement_at: i % 2 === 0 ? between(FROM, TO) : null,
				opens_at: i % 3 === 0 ? between(FROM, TO) : null,
				closes_at: i % 2 === 1 ? between(FROM, TO) : null,
			},
			taxonomies: { announcement_type: [type] },
		});
		await publish("announcements", announcement);
	};
	let next = 0;
	await Promise.all(
		Array.from({ length: PARALLEL }, async () => {
			while (next < COUNT) await make(next++);
		}),
	);
}

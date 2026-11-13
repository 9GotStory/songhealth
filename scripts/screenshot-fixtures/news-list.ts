// Screenshot content for the News list by its number of News (Feature 009 #281; spec #280
// "Testing Decisions": a full page of twelve, a second page, one and two News): the demo dataset's
// News are returned to draft for the run and NEWS_LIST_COUNT synthetic News take their place, 24
// unless given, which make two full pages. They mix what a News item can lack: every fifth has no
// picture, every second no category, every third no summary, and the second has a long title.
// Captures /news at the five widths the feature's tickets name, as news-list-<count>-<width>, and
// its second page when there is one, as news-list-<count>-page-2-<width>.
//
//   NEWS_LIST_COUNT=2 scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/news-list.ts <out-dir>

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

/** The fixed number of News a list page shows (src/lib/news.ts NEWS_PAGE_SIZE). */
const PAGE_SIZE = 12;

const TITLES = [
	"[ตัวอย่าง] ขอเชิญร่วมงานมหกรรมสุขภาพดีวิถีชุมชน ณ ลานอเนกประสงค์หน้าที่ว่าการอำเภอ",
	"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับเครือข่ายอาสาสมัครสาธารณสุขประจำหมู่บ้านลงพื้นที่เยี่ยมบ้านผู้สูงอายุและผู้ป่วยติดเตียง พร้อมให้คำแนะนำการดูแลสุขภาพในช่วงอากาศเปลี่ยนแปลง",
	"[ตัวอย่าง] แจ้งกำหนดการตรวจคัดกรองสายตาผู้สูงอายุ",
	"[ตัวอย่าง] รายงานสถานการณ์คุณภาพอากาศประจำวัน",
	"[ตัวอย่าง] อบรมการปฐมพยาบาลเบื้องต้นสำหรับครูและบุคลากรโรงเรียน",
	"[ตัวอย่าง] ประชาสัมพันธ์ช่องทางรับเรื่องร้องเรียนด้านคุ้มครองผู้บริโภค",
];
const SUMMARY =
	"สำนักงานสาธารณสุขอำเภอสองขอเชิญประชาชนในพื้นที่เข้าร่วมกิจกรรม สอบถามรายละเอียดได้ในวันและเวลาราชการ";
/** The pictures the News share, as pairs of the colours each blends. */
const PICTURES = [
	["#bfdcce", "#e8f0d9"],
	["#bae0cf", "#f2d17a"],
	["#d1ebde", "#0b6b57"],
];

const count = Number(process.env.NEWS_LIST_COUNT ?? 2 * PAGE_SIZE);
if (!Number.isInteger(count) || count < 1) {
	throw new Error(`NEWS_LIST_COUNT must be a whole number of News, 1 or more: ${count}`);
}

const fixtures: Fixtures = async ({ admin, helpers, borrow, picture, term }) => {
	await borrow("news");
	const pictures: string[] = [];
	for (const [index, [from, to]] of PICTURES.slice(0, count).entries()) {
		pictures.push(await picture(`ภาพประกอบข่าวตัวอย่าง ${index + 1}`, from!, to!));
	}
	const category = await term("news_category", "ประชาสัมพันธ์");
	// The first is the newest: each one after it is published a day earlier.
	for (let index = 0; index < count; index += 1) {
		const numbered = count > TITLES.length ? ` ฉบับที่ ${count - index}` : "";
		const entry = await helpers.createSyntheticEntry(admin, "news", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title: `${TITLES[index % TITLES.length]}${numbered}`,
				...(index % 3 === 2 ? {} : { summary: SUMMARY }),
				...(index % 5 === 3 ? {} : { featured_image: { id: pictures[index % pictures.length] } }),
			},
			taxonomies: index % 2 === 0 ? { news_category: [category] } : {},
		});
		if (!entry.result.ok) throw new Error(`news: ${helpers.nativeRefusalOf(entry.result)}`);
		const day = String(28 - index).padStart(2, "0");
		await helpers.publishEntryAt(admin, "news", entry.entryId!, `2026-10-${day}T03:00:00.000Z`);
	}
	return HOMEPAGE_WIDTHS.flatMap((width) => [
		{ name: `news-list-${count}-${width}`, path: `/news@${width}` },
		...(count > PAGE_SIZE
			? [{ name: `news-list-${count}-page-2-${width}`, path: `/news?page=2@${width}` }]
			: []),
	]);
};

export default fixtures;

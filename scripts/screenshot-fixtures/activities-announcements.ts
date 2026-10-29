// Screenshot content for the Activities and Announcements pages (#56): three published Activities,
// two with a picture and one without, the first with a captioned gallery; three published
// Announcements, one open with an attached Document, one without a close date and one closed.
// Captures both lists, an Activity page and the open and the closed Announcement.

import type { Fixtures } from "../capture-with-fixtures.ts";

const DAY = 24 * 60 * 60 * 1000;

const ACTIVITIES = [
	{
		title: "[ตัวอย่าง] ประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอสอง ครั้งที่ 3/2569",
		summary: "ติดตามแผนงานด้านสุขภาพของอำเภอ และวางแผนรับมือโรคไข้เลือดออกช่วงฤดูฝน",
		at: "2026-10-22T02:00:00.000Z",
		location: "ห้องประชุมที่ว่าการอำเภอสอง",
		participants: "นายอำเภอสอง หัวหน้าส่วนราชการ ผู้อำนวยการ รพ.สต. และผู้นำชุมชน",
		picture: ["#bfdcce", "#e8f0d9"],
		gallery: [
			{ caption: "ผู้เข้าร่วมลงทะเบียนก่อนเริ่มการประชุม", colours: ["#bae0cf", "#f2d17a"] },
			{ caption: "นำเสนอสถานการณ์โรคไข้เลือดออกในพื้นที่", colours: ["#d1ebde", "#e8f0cc"] },
			{ caption: "", colours: ["#bfdcce", "#f2d17a"] },
		],
	},
	{
		title: "[ตัวอย่าง] ลงพื้นที่ตรวจเยี่ยมการคัดกรองผู้สูงอายุ ตำบลบ้านกลาง",
		summary: "ทีมสาธารณสุขอำเภอร่วมกับ อสม. คัดกรองภาวะสมองเสื่อมและภาวะหกล้มในผู้สูงอายุ",
		at: "2026-10-15T02:00:00.000Z",
		location: "ศาลาอเนกประสงค์หมู่ 4 ตำบลบ้านกลาง",
		participants: "อสม. และเจ้าหน้าที่ รพ.สต.บ้านกลาง",
		picture: ["#d1ebde", "#e8f0cc"],
		gallery: [],
	},
	{
		title: "[ตัวอย่าง] อบรมฟื้นฟูความรู้ อสม. ด้านการป้องกันโรคติดต่อ",
		summary: "ทบทวนแนวทางการเฝ้าระวังโรคติดต่อในชุมชนสำหรับอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
		at: undefined,
		location: undefined,
		participants: undefined,
		picture: undefined,
		gallery: [],
	},
] as const;

const fixtures: Fixtures = async ({ admin, helpers, term, picture, block }) => {
	let activitySlug = "";
	for (const activity of ACTIVITIES) {
		const slug = helpers.syntheticSlug("shot");
		const gallery: Array<Record<string, unknown>> = [];
		for (const item of activity.gallery) {
			gallery.push({
				image: {
					id: await picture(item.caption || "ภาพกิจกรรม", item.colours[0], item.colours[1]),
				},
				...(item.caption ? { caption: item.caption } : {}),
			});
		}
		const created = await helpers.createSyntheticEntry(admin, "activities", {
			slug,
			data: {
				title: activity.title,
				summary: activity.summary,
				...(activity.at ? { activity_at: activity.at } : {}),
				...(activity.location ? { location_text: activity.location } : {}),
				...(activity.participants ? { participants_text: activity.participants } : {}),
				...(activity.picture
					? {
							featured_image: {
								id: await picture(
									`ภาพประกอบ ${activity.title}`,
									activity.picture[0],
									activity.picture[1],
								),
							},
						}
					: {}),
				...(gallery.length > 0 ? { gallery } : {}),
			},
		});
		if (!created.result.ok) throw new Error(`activity: ${helpers.nativeRefusalOf(created.result)}`);
		const published = await helpers.publishEntry(admin, "activities", created.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		if (activitySlug === "") activitySlug = slug;
	}

	const file = await helpers.uploadSyntheticPdf(
		admin,
		`${helpers.SYNTHETIC_FIXTURE_MARK}-shot-ใบสมัคร.pdf`,
	);
	const document = await helpers.createSyntheticEntry(admin, "documents", {
		slug: helpers.syntheticSlug("shot"),
		data: {
			title: "[ตัวอย่าง] ใบสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
			file: file.value,
			document_at: "2026-10-20T03:00:00.000Z",
		},
	});
	if (!document.result.ok) throw new Error(`document: ${helpers.nativeRefusalOf(document.result)}`);
	const documentPublished = await helpers.publishEntry(admin, "documents", document.entryId!);
	if (!documentPublished.ok)
		throw new Error(`publish: ${helpers.nativeRefusalOf(documentPublished)}`);

	const recruit = await term("announcement_type", "รับสมัคร");
	const notice = await term("announcement_type", "ประชาสัมพันธ์");
	const now = Date.now();
	const announcements = [
		{
			key: "open",
			title: "[ตัวอย่าง] รับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน ประจำปี 2570",
			type: recruit,
			announcementAt: new Date(now - 7 * DAY).toISOString(),
			opensAt: new Date(now - 7 * DAY).toISOString(),
			closesAt: new Date(now + 14 * DAY).toISOString(),
			details: [
				block("สำนักงานสาธารณสุขอำเภอสองรับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.) เพิ่มเติม"),
				block("คุณสมบัติผู้สมัคร", "h2"),
				block(
					"มีภูมิลำเนาในหมู่บ้านที่สมัครไม่น้อยกว่า 6 เดือน และสมัครใจปฏิบัติงานด้านสุขภาพในชุมชน",
				),
			],
			documents: [document.entryId!],
		},
		{
			key: "notice",
			title: "[ตัวอย่าง] งดให้บริการคลินิกทันตกรรมชั่วคราว เนื่องจากปรับปรุงห้องตรวจ",
			type: notice,
			announcementAt: new Date(now - 3 * DAY).toISOString(),
			opensAt: undefined,
			closesAt: undefined,
			details: [block("ประชาชนที่มีนัดหมาย โปรดติดต่อ รพ.สต. ในพื้นที่เพื่อเลื่อนนัด")],
			documents: [],
		},
		{
			key: "closed",
			title: "[ตัวอย่าง] รับสมัครผู้เข้าร่วมโครงการเลิกบุหรี่ รุ่นที่ 1/2569",
			type: recruit,
			announcementAt: "2026-06-01T03:00:00.000Z",
			opensAt: "2026-06-01T03:00:00.000Z",
			closesAt: "2026-06-30T10:00:00.000Z",
			details: [block("ปิดรับสมัครแล้ว ขอบคุณผู้สนใจทุกท่าน")],
			documents: [],
		},
	];
	const slugs = new Map<string, string>();
	for (const announcement of announcements) {
		const slug = helpers.syntheticSlug("shot");
		const created = await helpers.createSyntheticEntry(admin, "announcements", {
			slug,
			data: {
				title: announcement.title,
				details: announcement.details,
				announcement_at: announcement.announcementAt,
				...(announcement.opensAt ? { opens_at: announcement.opensAt } : {}),
				...(announcement.closesAt ? { closes_at: announcement.closesAt } : {}),
			},
			taxonomies: { announcement_type: [announcement.type] },
			...(announcement.documents.length > 0
				? { references: { documents: announcement.documents } }
				: {}),
		});
		if (!created.result.ok) {
			throw new Error(`announcement: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const published = await helpers.publishEntry(admin, "announcements", created.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		slugs.set(announcement.key, slug);
	}

	return [
		"/activities",
		{ name: "activity", path: `/activities/${activitySlug}` },
		"/announcements",
		{ name: "announcement-open", path: `/announcements/${slugs.get("open")}` },
		{ name: "announcement-closed", path: `/announcements/${slugs.get("closed")}` },
	];
};

export default fixtures;

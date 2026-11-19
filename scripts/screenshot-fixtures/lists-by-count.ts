// Screenshot content for the Activities, Announcements and Documents lists by their number of
// entries (Feature 010 #312; spec #311 "Further Notes": the demo dataset holds no full page, no
// second page, no expired Document and no file that cannot be served). LIST names the list, and
// the demo dataset's entries of it are returned to draft for the run while LIST_COUNT synthetic
// ones take their place, two full pages unless given. Captures the list at the five widths the
// feature's tickets name, as <list>-list-<count>-<width>, and its second page when there is one,
// as <list>-list-<count>-page-2-<width>.
//
// - activities: every fifth has no picture, every third no place, every fourth no summary, and the
//   second has a long title; each was held a day before the one above it.
// - announcements: procurement, recruitment and other in turn; every fourth is closed, every
//   seventh not open yet, every fifth without open or close dates, and the second has a long title.
// - documents: the second is expired and the third's file cannot be served, which are captured on
//   their pages too, as document-expired-<width> and document-file-gone-<width>.
// - services (Feature 011 #339): three Service Categories in turn; every fourth has no summary,
//   every third the standard icon, and the second a long name. The catalog orders by name.
// - health-services (#339): two Areas and three Facility Types in turn; the first is inactive and
//   the second has no coordinates, both captured on their pages too, as health-service-inactive-
//   <width> and health-service-no-map-<width>; every fifth is closed for now, every third has a
//   display name, and the fourth has no address.
// - health-reports (#339): two Report Types in turn, each describing one published Document but
//   the third, whose Document is unpublished after the report is; the second has no fiscal year,
//   and every third no report date, so its publication places it. Both are captured on their
//   pages too, as health-report-no-fiscal-year-<width> and health-report-document-unpublished-
//   <width>. The fourth describes a published Document whose file is deleted (#343), captured as
//   health-report-file-gone-<width>.
//
//   LIST=activities LIST_COUNT=4 scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/lists-by-count.ts <out-dir>

import type { Capture, FixtureKit, Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const DAY = 24 * 60 * 60 * 1000;

/** Each list's path and the fixed number of entries a page of it shows (src/lib/*.ts). */
const LISTS = {
	activities: { path: "/activities", pageSize: 12 },
	announcements: { path: "/announcements", pageSize: 20 },
	documents: { path: "/documents", pageSize: 20 },
	services: { path: "/services", pageSize: 12 },
	"health-services": { path: "/health-services", pageSize: 20 },
	"health-reports": { path: "/health/reports", pageSize: 20 },
} as const;

type List = keyof typeof LISTS;

/** The collection each list shows, whose published entries the run borrows. */
const COLLECTIONS: Record<List, string> = {
	activities: "activities",
	announcements: "announcements",
	documents: "documents",
	services: "services",
	"health-services": "health_services",
	"health-reports": "health_reports",
};

const list = process.env.LIST as List;
if (!(list in LISTS)) {
	throw new Error(`LIST must be one of ${Object.keys(LISTS).join(", ")}: ${process.env.LIST}`);
}
const { path, pageSize } = LISTS[list];
const count = Number(process.env.LIST_COUNT ?? 2 * pageSize);
if (!Number.isInteger(count) || count < 1 || count > 2 * pageSize) {
	throw new Error(`LIST_COUNT must be a whole number, 1 to ${2 * pageSize}: ${count}`);
}

const LONG_TITLE =
	"[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับเครือข่ายอาสาสมัครสาธารณสุขประจำหมู่บ้านลงพื้นที่ให้ความรู้และติดตามการดูแลสุขภาพของประชาชนในทุกตำบลตลอดเดือน";

/** The title of the `index`th entry, numbered when the titles repeat. */
function titleOf(titles: readonly string[], index: number): string {
	if (index === 1) return LONG_TITLE;
	const numbered = count > titles.length ? ` ลำดับที่ ${count - index}` : "";
	return `${titles[index % titles.length]}${numbered}`;
}

/** The instant `days` days before now. */
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

async function activities({ admin, helpers, picture }: FixtureKit): Promise<void> {
	const titles = [
		"[ตัวอย่าง] ประชุมทีมงานตัวอย่างประจำเดือน",
		"[ตัวอย่าง] ลงพื้นที่หมู่บ้านตัวอย่างเพื่อติดตามงาน",
		"[ตัวอย่าง] อบรมทบทวนความรู้สำหรับทีมตัวอย่าง",
		"[ตัวอย่าง] กิจกรรมตัวอย่างร่วมกับโรงเรียนในพื้นที่",
	];
	const pictures = [
		await picture("ภาพกิจกรรมตัวอย่าง 1", "#bfdcce", "#e8f0d9"),
		await picture("ภาพกิจกรรมตัวอย่าง 2", "#bae0cf", "#f2d17a"),
	];
	for (let index = 0; index < count; index += 1) {
		const entry = await helpers.createSyntheticEntry(admin, "activities", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title: titleOf(titles, index),
				...(index % 4 === 3
					? {}
					: { summary: "ทีมสาธารณสุขอำเภอร่วมกับเครือข่ายในพื้นที่ดำเนินกิจกรรมตามแผนงานประจำปี" }),
				activity_at: daysAgo(index + 2),
				...(index % 3 === 2 ? {} : { location_text: "ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง" }),
				...(index % 5 === 4 ? {} : { featured_image: { id: pictures[index % pictures.length] } }),
			},
		});
		if (!entry.result.ok) throw new Error(`activity: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "activities", entry.entryId!, daysAgo(index + 1));
	}
}

async function announcements({ admin, helpers, block }: FixtureKit): Promise<void> {
	const titles = [
		"[ตัวอย่าง] ประกวดราคาจัดซื้อวัสดุการแพทย์",
		"[ตัวอย่าง] รับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
		"[ตัวอย่าง] แจ้งปิดปรับปรุงห้องตรวจชั่วคราว",
		"[ตัวอย่าง] เชิญชวนเข้าร่วมโครงการเลิกบุหรี่",
	];
	const types = ["procurement", "recruitment", "general"];
	for (let index = 0; index < count; index += 1) {
		const dates =
			index % 5 === 4
				? {}
				: index % 4 === 3
					? { opens_at: daysAgo(index + 40), closes_at: daysAgo(index + 1) }
					: index % 7 === 6
						? { opens_at: daysAgo(-10), closes_at: daysAgo(-40) }
						: { opens_at: daysAgo(index + 1), closes_at: daysAgo(-30) };
		const entry = await helpers.createSyntheticEntry(admin, "announcements", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title: titleOf(titles, index),
				details: [block("รายละเอียดตามประกาศของสำนักงานสาธารณสุขอำเภอสอง")],
				announcement_at: daysAgo(index + 1),
				...dates,
			},
			taxonomies: { announcement_type: [types[index % types.length]!] },
		});
		if (!entry.result.ok) throw new Error(`announcement: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "announcements", entry.entryId!, daysAgo(index + 1));
	}
}

async function documents({ admin, helpers, term }: FixtureKit): Promise<Capture[]> {
	const titles = [
		"[ตัวอย่าง] แบบฟอร์มขอรับบริการตรวจสุขภาพประจำปี",
		"[ตัวอย่าง] รายงานสถานการณ์โรคไข้เลือดออกประจำไตรมาส",
		"[ตัวอย่าง] คู่มือการดูแลผู้สูงอายุสำหรับอาสาสมัคร",
		"[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุขประจำปี",
	];
	const types = [
		await term("document_type", "แบบฟอร์ม"),
		await term("document_type", "รายงาน"),
		await term("document_type", "คู่มือ"),
	];
	const shared = await helpers.uploadSyntheticPdf(admin);
	const pages = new Map<string, string>();
	for (let index = 0; index < count; index += 1) {
		const gone = index === 2 ? await helpers.uploadSyntheticPdf(admin) : undefined;
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "documents", {
			slug,
			data: {
				title: titleOf(titles, index),
				...(index % 4 === 3
					? {}
					: { summary: "เอกสารเผยแพร่ของสำนักงานสาธารณสุขอำเภอสองสำหรับประชาชนและเครือข่าย" }),
				file: (gone ?? shared).value,
				document_at: daysAgo(index + 2),
				...(index % 3 === 2 ? {} : { fiscal_year: index < count / 2 ? 2570 : 2569 }),
				owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
				...(index === 1 ? { domain_status: "expired" } : {}),
			},
			taxonomies: { document_type: [types[index % types.length]!] },
		});
		if (!entry.result.ok) throw new Error(`document: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "documents", entry.entryId!, daysAgo(index + 1));
		if (gone !== undefined) {
			const removed = await helpers.deleteMedia(admin, gone.mediaId);
			if (!removed.ok) throw new Error(`delete file: ${helpers.nativeRefusalOf(removed)}`);
			pages.set("document-file-gone", slug);
		}
		if (index === 1) pages.set("document-expired", slug);
	}
	return [...pages].flatMap(([name, slug]) =>
		HOMEPAGE_WIDTHS.map((width) => ({
			name: `${name}-${width}`,
			path: `/documents/${slug}@${width}`,
		})),
	);
}

/** The pages of `slugs` at the five widths, each named by its key. */
const pagesAt = (base: string, slugs: Map<string, string>): Capture[] =>
	[...slugs].flatMap(([name, slug]) =>
		HOMEPAGE_WIDTHS.map((width) => ({
			name: `${name}-${width}`,
			path: `${base}/${slug}@${width}`,
		})),
	);

async function services({ admin, helpers, term }: FixtureKit): Promise<void> {
	const titles = [
		"[ตัวอย่าง] ขอรับคำปรึกษาด้านสุขภาพ",
		"[ตัวอย่าง] แจ้งเหตุความเดือดร้อนด้านสุขภาพในชุมชน",
		"[ตัวอย่าง] ขอสำเนาเอกสารของสำนักงาน",
		"[ตัวอย่าง] รับวัคซีนตามนัด",
	];
	const categories = [
		await term("service_category", "ร้องเรียนและเสนอแนะ"),
		await term("service_category", "แจ้งปัญหาสุขภาพ"),
		await term("service_category", "ขอข้อมูลและบริการอื่น"),
	];
	const icons = ["เข็มฉีดยา", "หัวใจและชีพจร", undefined, "แผ่นรายการ"];
	for (let index = 0; index < count; index += 1) {
		const icon = index % 3 === 2 ? undefined : icons[index % icons.length];
		const entry = await helpers.createSyntheticEntry(admin, "services", {
			slug: helpers.syntheticSlug("shot"),
			data: {
				title: titleOf(titles, index),
				...(index % 4 === 3
					? {}
					: {
							summary:
								"บริการของสำนักงานสาธารณสุขอำเภอสองสำหรับประชาชนในพื้นที่ พร้อมช่องทางและขั้นตอน",
						}),
				...(icon ? { icon } : {}),
			},
			taxonomies: { service_category: [categories[index % categories.length]!] },
		});
		if (!entry.result.ok) throw new Error(`service: ${helpers.nativeRefusalOf(entry.result)}`);
		await helpers.publishEntryAt(admin, "services", entry.entryId!, daysAgo(index + 1));
	}
}

async function healthServices({ admin, helpers, term }: FixtureKit): Promise<Capture[]> {
	const titles = [
		"[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลตัวอย่าง",
		"[ตัวอย่าง] สถานีอนามัยบ้านตัวอย่าง",
		"[ตัวอย่าง] ศูนย์สุขภาพชุมชนตัวอย่าง",
		"[ตัวอย่าง] คลินิกชุมชนอบอุ่นตัวอย่าง",
	];
	const areas = [await term("area", "ตำบลตัวอย่างเหนือ"), await term("area", "ตำบลตัวอย่างใต้")];
	const types = [
		await term("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล"),
		await term("facility_type", "สถานีอนามัย"),
		await term("facility_type", "ศูนย์สุขภาพชุมชน"),
	];
	const pages = new Map<string, string>();
	for (let index = 0; index < count; index += 1) {
		const slug = helpers.syntheticSlug("shot");
		const title = titleOf(titles, index);
		const status = index === 0 ? "inactive" : index % 5 === 4 ? "temporarily_closed" : "active";
		const entry = await helpers.createSyntheticEntry(admin, "health_services", {
			slug,
			data: {
				title,
				...(index % 3 === 2
					? { display_name: title.replace("โรงพยาบาลส่งเสริมสุขภาพตำบล", "รพ.สต.") }
					: {}),
				operational_status: status,
				...(index === 3 ? {} : { address: "99 หมู่ 9 ตำบลตัวอย่าง อำเภอสอง จังหวัดแพร่ 54120" }),
				opening_hours: "จันทร์–ศุกร์ 08.30–16.30 น.",
				public_contact: "โทร 054 000 000",
				...(index === 1
					? {}
					: { latitude: 18.47 + index / 1000, longitude: 100.19 + index / 1000 }),
			},
			taxonomies: {
				facility_type: [types[index % types.length]!],
				area: [areas[index % areas.length]!],
			},
		});
		if (!entry.result.ok) {
			throw new Error(`health service: ${helpers.nativeRefusalOf(entry.result)}`);
		}
		await helpers.publishEntryAt(admin, "health_services", entry.entryId!, daysAgo(index + 1));
		if (index === 0) pages.set("health-service-inactive", slug);
		if (index === 1) pages.set("health-service-no-map", slug);
	}
	return pagesAt("/health-services", pages);
}

async function healthReports({ admin, helpers, term }: FixtureKit): Promise<Capture[]> {
	const titles = [
		"[ตัวอย่าง] รายงานสถานการณ์โรคประจำไตรมาส",
		"[ตัวอย่าง] รายงานผลการดำเนินงานสาธารณสุขประจำปี",
		"[ตัวอย่าง] รายงานความครอบคลุมการได้รับวัคซีน",
		"[ตัวอย่าง] รายงานการเฝ้าระวังโรคในชุมชน",
	];
	const types = [
		await term("report_type", "รายงานสถานการณ์โรค"),
		await term("report_type", "รายงานผลการดำเนินงาน"),
	];
	/** A published Document for a report to describe. */
	const reportDocument = async (title: string) => {
		const document = await helpers.createSyntheticDocument(admin, "shot", {
			data: { title, fiscal_year: 2569, owner_source: "สำนักงานสาธารณสุขอำเภอสอง" },
			taxonomies: { document_type: [await term("document_type", "รายงาน")] },
		});
		await helpers.publishEntryAt(admin, "documents", document.id);
		return document;
	};
	const shared = (await reportDocument("[ตัวอย่าง] เอกสารรายงานฉบับเต็ม")).id;
	const pages = new Map<string, string>();
	for (let index = 0; index < count; index += 1) {
		const slug = helpers.syntheticSlug("shot");
		const own =
			index === 2 ? await reportDocument("[ตัวอย่าง] เอกสารรายงานที่เลิกเผยแพร่") : undefined;
		const fileGone =
			index === 3 ? await reportDocument("[ตัวอย่าง] เอกสารรายงานที่ไฟล์ถูกลบ") : undefined;
		const entry = await helpers.createSyntheticEntry(admin, "health_reports", {
			slug,
			data: {
				title: titleOf(titles, index),
				...(index % 4 === 3
					? {}
					: {
							summary: "สรุปสถานการณ์และผลการดำเนินงานด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง",
						}),
				reporting_period: "ตุลาคม 2568 – กันยายน 2569",
				owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
				...(index === 1 ? {} : { fiscal_year: index < count / 2 ? 2570 : 2569 }),
				...(index % 3 === 2 ? {} : { report_at: daysAgo(index + 2) }),
			},
			taxonomies: { report_type: [types[index % types.length]!] },
			references: { report_document: [(own ?? fileGone)?.id ?? shared] },
		});
		if (!entry.result.ok) {
			throw new Error(`health report: ${helpers.nativeRefusalOf(entry.result)}`);
		}
		await helpers.publishEntryAt(admin, "health_reports", entry.entryId!, daysAgo(index + 1));
		if (own !== undefined) {
			const unpublished = await helpers.unpublishEntry(admin, "documents", own.id);
			if (!unpublished.ok) throw new Error(`unpublish: ${helpers.nativeRefusalOf(unpublished)}`);
			pages.set("health-report-document-unpublished", slug);
		}
		if (fileGone !== undefined) {
			const removed = await helpers.deleteMedia(admin, fileGone.file.mediaId);
			if (!removed.ok) throw new Error(`delete file: ${helpers.nativeRefusalOf(removed)}`);
			pages.set("health-report-file-gone", slug);
		}
		if (index === 1) pages.set("health-report-no-fiscal-year", slug);
	}
	return pagesAt("/health/reports", pages);
}

const fixtures: Fixtures = async (kit) => {
	await kit.borrow(COLLECTIONS[list]);
	const pages =
		list === "activities"
			? (await activities(kit), [])
			: list === "announcements"
				? (await announcements(kit), [])
				: list === "documents"
					? await documents(kit)
					: list === "services"
						? (await services(kit), [])
						: list === "health-services"
							? await healthServices(kit)
							: await healthReports(kit);
	return [
		...HOMEPAGE_WIDTHS.flatMap((width) => [
			{ name: `${list}-list-${count}-${width}`, path: `${path}@${width}` },
			...(count > pageSize
				? [{ name: `${list}-list-${count}-page-2-${width}`, path: `${path}?page=2@${width}` }]
				: []),
		]),
		...pages,
	];
};

export default fixtures;

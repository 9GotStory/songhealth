// The demo dataset (#66; spec #51 "Demo dataset", approved Q4): a handful of each kind of content,
// enough to fill every page and every Homepage section, so the Product Owner can browse the site
// before real content exists. Every title starts with "[ตัวอย่าง]" and every slug with "demo-",
// except the reserved Basic Pages', which are the pages' own. Dates count from the day `add` runs.

import {
	DEMO_MARK,
	type DemoDataset,
	type DemoEntry,
	type DocumentPdf,
	type DemoMedia,
	type DemoMenuItem,
	type DemoTerm,
	type MediaRef,
} from "./plan.ts";

const DAY = 24 * 60 * 60 * 1000;

/** A demo title without its leading mark. */
const unmarked = (title: string) => title.slice(`${DEMO_MARK} `.length);

/** A term of `taxonomy` under the demo slug `demo-{name}`. */
const term = (taxonomy: string, name: string, label: string): DemoTerm => ({
	taxonomy,
	slug: `demo-${name}`,
	label,
});

/** Health Topics, which make a News item Health News. */
const TOPICS = {
	dengue: term("topic", "topic-dengue", "ไข้เลือดออก"),
	ncd: term("topic", "topic-ncd", "โรคไม่ติดต่อเรื้อรัง"),
	vaccine: term("topic", "topic-vaccine", "วัคซีนและการสร้างเสริมภูมิคุ้มกัน"),
	tobacco: term("topic", "topic-tobacco", "บุหรี่และเครื่องดื่มแอลกอฮอล์"),
	elderly: term("topic", "topic-elderly", "ผู้สูงอายุ"),
};

/** Document Types beyond the reference terms `policy`, `plan` and `result` (seed/seed.json). */
const DOCUMENT_TYPES = {
	form: term("document_type", "document-form", "แบบฟอร์ม"),
	report: term("document_type", "document-report", "รายงาน"),
};

const ANNOUNCEMENT_TYPES = {
	recruitment: term("announcement_type", "announcement-recruitment", "รับสมัคร"),
	notice: term("announcement_type", "announcement-notice", "ประชาสัมพันธ์"),
};

const SERVICE_CATEGORIES = {
	complaints: term("service_category", "service-complaints", "ร้องเรียนและเสนอแนะ"),
	reports: term("service_category", "service-reports", "แจ้งปัญหาสุขภาพ"),
	requests: term("service_category", "service-requests", "ขอข้อมูลและบริการอื่น"),
};

/** The Areas the demo Health Services are in, three of the eight subdistricts of อำเภอสอง. */
const AREAS = {
	banKlang: term("area", "area-ban-klang", "ตำบลบ้านกลาง"),
	saIap: term("area", "area-sa-iap", "ตำบลสะเอียบ"),
	huaiMai: term("area", "area-huai-mai", "ตำบลห้วยหม้าย"),
};

const FACILITY_TYPES = {
	hospital: term("facility_type", "facility-hospital", "โรงพยาบาลชุมชน"),
	clinic: term("facility_type", "facility-clinic", "โรงพยาบาลส่งเสริมสุขภาพตำบล"),
};

const REPORT_TYPES = {
	situation: term("report_type", "report-situation", "รายงานสถานการณ์โรค"),
	performance: term("report_type", "report-performance", "รายงานผลการดำเนินงาน"),
};

const NEWS_CATEGORIES = {
	publicRelations: term("news_category", "news-public-relations", "ข่าวประชาสัมพันธ์"),
	activity: term("news_category", "news-activity", "ข่าวกิจกรรม"),
};

/** A Portable Text body as the Admin editor saves it: a block a paragraph, "## " for a heading. */
function body(...paragraphs: string[]): Record<string, unknown>[] {
	return paragraphs.map((paragraph, index) => {
		const heading = paragraph.startsWith("## ");
		return {
			_type: "block",
			_key: `p${index}`,
			style: heading ? "h2" : "normal",
			markDefs: [],
			children: [
				{
					_type: "span",
					_key: `p${index}s`,
					text: heading ? paragraph.slice(3) : paragraph,
					marks: [],
				},
			],
		};
	});
}

/** The demo dataset, dated from `now`. */
export function demoDataset(now: Date): DemoDataset {
	/** 09:00 in Thailand (02:00 UTC), `days` before the day of `now`. */
	const ago = (days: number) => {
		const day = new Date(now.getTime() - days * DAY);
		day.setUTCHours(2, 0, 0, 0);
		return day.toISOString();
	};
	/** 09:00 in Thailand, `days` after the day of `now`. */
	const ahead = (days: number) => ago(-days);
	const media: DemoMedia[] = [];
	/** A picture `demo-{name}.png` blending two colours, and the field value that stands for it. */
	const picture = (name: string, alt: string, from: string, to: string): MediaRef => {
		const filename = `demo-${name}.png`;
		media.push({ filename, alt, colours: [from, to] });
		return { demoMedia: filename };
	};
	/** A PDF `demo-{name}.pdf` that shows `text`, and the field value that stands for it. */
	const pdf = (name: string, text: DocumentPdf): MediaRef => {
		const filename = `demo-${name}.pdf`;
		media.push({ filename, pdf: text });
		return { demoMedia: filename };
	};
	/** A Document of the office, under `demo-document-{name}` with its own PDF. */
	const document = (
		name: string,
		type: string,
		{
			references,
			topic,
			...data
		}: {
			title: string;
			summary: string;
			references?: Record<string, string[]>;
			topic?: string;
		} & Record<string, unknown>,
		publishedDaysAgo: number,
	): DemoEntry => ({
		collection: "documents",
		slug: `demo-document-${name}`,
		taxonomies: { document_type: [type], ...(topic ? { topic: [topic] } : {}) },
		...(references ? { references } : {}),
		publishedAt: ago(publishedDaysAgo),
		data: {
			file: pdf(`document-${name}`, { title: data.title, summary: data.summary }),
			owner_source: "สำนักงานสาธารณสุขอำเภอสอง",
			document_at: ago(publishedDaysAgo + 1),
			...data,
		},
	});

	const news: DemoEntry[] = [
		{
			collection: "news",
			slug: "demo-news-ncd-screening",
			taxonomies: {
				news_category: [NEWS_CATEGORIES.publicRelations.slug],
				topic: [TOPICS.ncd.slug],
			},
			publishedAt: ago(2),
			data: {
				title: "[ตัวอย่าง] ชวนประชาชนอายุ 35 ปีขึ้นไป ตรวจคัดกรองเบาหวานและความดันโลหิตสูงฟรี",
				summary: "รพ.สต. ทุกแห่งในอำเภอสองเปิดจุดตรวจคัดกรองในวันและเวลาราชการ ไม่ต้องนัดล่วงหน้า",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				featured_image: picture(
					"news-ncd-screening",
					"ภาพประกอบข่าวการตรวจคัดกรองเบาหวานและความดันโลหิตสูง",
					"#f0f5fc",
					"#0b6b57",
				),
				body: body(
					"สำนักงานสาธารณสุขอำเภอสองร่วมกับโรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่ง เชิญชวนประชาชนอายุ 35 ปีขึ้นไปรับการตรวจคัดกรองเบาหวานและความดันโลหิตสูงโดยไม่เสียค่าใช้จ่าย",
					"## สิ่งที่ควรเตรียม",
					"บัตรประจำตัวประชาชน และงดน้ำและอาหารอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือดตรวจระดับน้ำตาล",
				),
			},
		},
		{
			collection: "news",
			slug: "demo-news-larvae-survey",
			taxonomies: { news_category: [NEWS_CATEGORIES.activity.slug], topic: [TOPICS.dengue.slug] },
			publishedAt: ago(6),
			data: {
				title: "[ตัวอย่าง] อสม. อำเภอสองสำรวจลูกน้ำยุงลายทุกหลังคาเรือน ลดเสี่ยงไข้เลือดออก",
				summary:
					"อาสาสมัครสาธารณสุขประจำหมู่บ้านลงพื้นที่สำรวจและกำจัดแหล่งเพาะพันธุ์ยุงลาย พร้อมแนะนำหลัก 3 เก็บ ป้องกัน 3 โรค",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				featured_image: picture(
					"news-larvae-survey",
					"ภาพประกอบข่าวการสำรวจลูกน้ำยุงลาย",
					"#bae0cf",
					"#f2d17a",
				),
				body: body(
					"อาสาสมัครสาธารณสุขประจำหมู่บ้านทั้ง 8 ตำบลลงพื้นที่สำรวจภาชนะขังน้ำในบ้านและรอบบ้าน เพื่อตัดวงจรการแพร่พันธุ์ของยุงลาย",
					"ประชาชนช่วยกันได้ด้วยการเปลี่ยนน้ำในแจกันทุก 7 วัน ปิดฝาโอ่งน้ำ และเก็บขยะที่อาจขังน้ำได้",
				),
			},
		},
		{
			collection: "news",
			slug: "demo-news-district-board",
			taxonomies: { news_category: [NEWS_CATEGORIES.activity.slug] },
			publishedAt: ago(10),
			data: {
				title: "[ตัวอย่าง] ประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอสอง ครั้งที่ 4/2569",
				summary:
					"ติดตามผลการดำเนินงานด้านสุขภาพ และกำหนดประเด็นพัฒนาคุณภาพชีวิตของอำเภอสองในปีถัดไป",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				body: body(
					"ที่ประชุมรับทราบผลการดำเนินงานการดูแลผู้สูงอายุที่มีภาวะพึ่งพิง และเห็นชอบให้การป้องกันอุบัติเหตุทางถนนเป็นประเด็นหลักของปีถัดไป",
				),
			},
		},
		{
			collection: "news",
			slug: "demo-news-flu-vaccine",
			taxonomies: {
				news_category: [NEWS_CATEGORIES.publicRelations.slug],
				topic: [TOPICS.vaccine.slug],
			},
			publishedAt: ago(15),
			data: {
				title: "[ตัวอย่าง] เริ่มให้บริการวัคซีนป้องกันไข้หวัดใหญ่สำหรับกลุ่มเสี่ยง ประจำปี 2569",
				summary:
					"ผู้สูงอายุ ผู้มีโรคเรื้อรัง หญิงตั้งครรภ์ และเด็กเล็ก รับวัคซีนได้ที่โรงพยาบาลส่งเสริมสุขภาพตำบลใกล้บ้าน",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				featured_image: picture(
					"news-flu-vaccine",
					"ภาพประกอบข่าวการให้บริการวัคซีนไข้หวัดใหญ่",
					"#d1ebde",
					"#e8f0cc",
				),
				body: body(
					"วัคซีนไข้หวัดใหญ่ช่วยลดความรุนแรงของโรคและการนอนโรงพยาบาลในกลุ่มเสี่ยง ควรรับวัคซีนปีละ 1 ครั้ง",
					"## กลุ่มที่ควรได้รับวัคซีน",
					"ผู้มีอายุ 65 ปีขึ้นไป ผู้ป่วยโรคเรื้อรัง หญิงตั้งครรภ์อายุครรภ์ 4 เดือนขึ้นไป และเด็กอายุ 6 เดือนถึง 2 ปี",
				),
			},
		},
		{
			collection: "news",
			slug: "demo-news-smoke-free-village",
			taxonomies: { news_category: [NEWS_CATEGORIES.activity.slug], topic: [TOPICS.tobacco.slug] },
			publishedAt: ago(21),
			data: {
				title: "[ตัวอย่าง] มอบเกียรติบัตรหมู่บ้านปลอดบุหรี่ ต้นแบบของอำเภอสอง",
				summary:
					"สามหมู่บ้านผ่านเกณฑ์หมู่บ้านปลอดบุหรี่ หลังรณรงค์ร่วมกับผู้นำชุมชนและ อสม. ตลอดปี",
				source_text: "สำนักงานสาธารณสุขอำเภอสอง",
				body: body(
					"หมู่บ้านต้นแบบจัดเขตปลอดบุหรี่ในที่สาธารณะ และมีคลินิกช่วยเลิกบุหรี่ที่ รพ.สต. ในพื้นที่",
				),
			},
		},
	];

	const documents: DemoEntry[] = [
		document(
			"policy-2570",
			"policy",
			{
				title: "[ตัวอย่าง] นโยบายการบริหารงานสาธารณสุขอำเภอสอง ปีงบประมาณ 2570",
				summary: "ทิศทางและนโยบายการดำเนินงานด้านสาธารณสุขของอำเภอสองในปีงบประมาณ 2570",
				fiscal_year: 2570,
				domain_status: "current",
			},
			30,
		),
		document(
			"privacy-policy",
			"policy",
			{
				title: "[ตัวอย่าง] นโยบายคุ้มครองข้อมูลส่วนบุคคลของสำนักงานสาธารณสุขอำเภอสอง",
				summary: "หลักการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของผู้มาติดต่อสำนักงาน",
				fiscal_year: 2569,
				domain_status: "current",
			},
			120,
		),
		document(
			"plan-2570",
			"plan",
			{
				title: "[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข อำเภอสอง ปีงบประมาณ 2570",
				summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง ประจำปีงบประมาณ 2570",
				fiscal_year: 2570,
				domain_status: "current",
			},
			31,
		),
		document(
			"plan-2569",
			"plan",
			{
				title: "[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข อำเภอสอง ปีงบประมาณ 2569",
				summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง ประจำปีงบประมาณ 2569",
				fiscal_year: 2569,
				domain_status: "superseded",
				references: { successor: ["demo-document-plan-2570"] },
			},
			395,
		),
		document(
			"result-2569",
			"result",
			{
				title: "[ตัวอย่าง] รายงานผลการดำเนินงานสาธารณสุข อำเภอสอง ปีงบประมาณ 2569",
				summary: "สรุปผลการดำเนินงานตามตัวชี้วัดสำคัญของเครือข่ายบริการสุขภาพอำเภอสอง",
				fiscal_year: 2569,
				domain_status: "current",
			},
			20,
		),
		document(
			"flu-vaccine-form",
			DOCUMENT_TYPES.form.slug,
			{
				title: "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีนไข้หวัดใหญ่สำหรับกลุ่มเสี่ยง",
				summary: "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่",
				fiscal_year: 2570,
				topic: TOPICS.vaccine.slug,
			},
			14,
		),
		document(
			"complaint-form",
			DOCUMENT_TYPES.form.slug,
			{
				title: "[ตัวอย่าง] แบบคำร้องเรียนการปฏิบัติงานหรือการให้บริการ",
				summary: "แบบคำร้องสำหรับแจ้งเรื่องร้องเรียนต่อสำนักงานสาธารณสุขอำเภอสอง",
				fiscal_year: 2570,
			},
			40,
		),
		document(
			"vhv-application",
			DOCUMENT_TYPES.form.slug,
			{
				title: "[ตัวอย่าง] ใบสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
				summary: "ใบสมัครสำหรับผู้สนใจเป็นอาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.)",
				fiscal_year: 2570,
			},
			6,
		),
	];

	const announcements: DemoEntry[] = [
		{
			collection: "announcements",
			slug: "demo-announcement-vhv-recruitment",
			taxonomies: { announcement_type: [ANNOUNCEMENT_TYPES.recruitment.slug] },
			references: { documents: ["demo-document-vhv-application"] },
			publishedAt: ago(6),
			data: {
				title: "[ตัวอย่าง] รับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน ประจำปี 2570",
				announcement_at: ago(6),
				opens_at: ago(6),
				closes_at: ahead(30),
				details: body(
					"สำนักงานสาธารณสุขอำเภอสองรับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.) เพิ่มเติมในทุกตำบล",
					"## คุณสมบัติผู้สมัคร",
					"อายุ 18 ปีขึ้นไป มีภูมิลำเนาในหมู่บ้านที่สมัครไม่น้อยกว่า 6 เดือน และสมัครใจปฏิบัติงานด้านสุขภาพในชุมชน",
					"## วิธีสมัคร",
					"ยื่นใบสมัครพร้อมสำเนาบัตรประจำตัวประชาชนที่ รพ.สต. ในพื้นที่ ในวันและเวลาราชการ",
				),
			},
		},
		{
			collection: "announcements",
			slug: "demo-announcement-dental-closure",
			taxonomies: { announcement_type: [ANNOUNCEMENT_TYPES.notice.slug] },
			publishedAt: ago(3),
			data: {
				title: "[ตัวอย่าง] งดให้บริการคลินิกทันตกรรมชั่วคราว ระหว่างปรับปรุงห้องตรวจ",
				announcement_at: ago(3),
				details: body(
					"คลินิกทันตกรรม รพ.สต.บ้านกลาง งดให้บริการชั่วคราวระหว่างปรับปรุงห้องตรวจ ผู้ที่มีนัดหมายโปรดติดต่อ รพ.สต. เพื่อเลื่อนนัด",
				),
			},
		},
		{
			collection: "announcements",
			slug: "demo-announcement-flu-vaccine",
			taxonomies: { announcement_type: [ANNOUNCEMENT_TYPES.notice.slug] },
			publishedAt: ago(12),
			data: {
				title: "[ตัวอย่าง] เชิญชวนผู้สูงอายุและผู้มีโรคเรื้อรังรับวัคซีนไข้หวัดใหญ่ฟรี",
				announcement_at: ago(12),
				closes_at: ahead(45),
				details: body(
					"ผู้มีอายุ 65 ปีขึ้นไปและผู้ป่วยโรคเรื้อรังรับวัคซีนไข้หวัดใหญ่ได้ฟรีที่โรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่งในอำเภอสอง",
				),
			},
		},
		{
			collection: "announcements",
			slug: "demo-announcement-quit-smoking-2",
			taxonomies: { announcement_type: [ANNOUNCEMENT_TYPES.recruitment.slug] },
			publishedAt: ago(1),
			data: {
				title: "[ตัวอย่าง] เปิดรับสมัครผู้เข้าร่วมโครงการเลิกบุหรี่ รุ่นที่ 2/2570",
				announcement_at: ago(1),
				opens_at: ahead(10),
				closes_at: ahead(40),
				details: body(
					"ผู้สนใจเลิกบุหรี่สมัครได้ที่ รพ.สต. ทุกแห่งในอำเภอสองเมื่อถึงวันเปิดรับสมัคร โครงการมีคลินิกให้คำปรึกษาตลอด 3 เดือน",
				),
			},
		},
		{
			collection: "announcements",
			slug: "demo-announcement-quit-smoking-1",
			taxonomies: { announcement_type: [ANNOUNCEMENT_TYPES.recruitment.slug] },
			publishedAt: ago(150),
			data: {
				title: "[ตัวอย่าง] รับสมัครผู้เข้าร่วมโครงการเลิกบุหรี่ รุ่นที่ 1/2569",
				announcement_at: ago(150),
				opens_at: ago(150),
				closes_at: ago(120),
				details: body("ปิดรับสมัครแล้ว ขอบคุณผู้สนใจทุกท่าน"),
			},
		},
	];

	/** A Service of the `00` §8.2 catalog, under `demo-service-{name}`. */
	const service = (
		name: string,
		category: DemoTerm,
		data: Record<string, unknown>,
		references?: Record<string, string[]>,
	): DemoEntry => ({
		collection: "services",
		slug: `demo-service-${name}`,
		taxonomies: { service_category: [category.slug] },
		...(references ? { references } : {}),
		publishedAt: ago(45),
		data,
	});
	const services: DemoEntry[] = [
		service(
			"complaint",
			SERVICE_CATEGORIES.complaints,
			{
				title: "[ตัวอย่าง] ร้องเรียนการปฏิบัติงานหรือการให้บริการ",
				summary: "แจ้งเรื่องที่ไม่ได้รับความสะดวกหรือไม่เป็นธรรมจากการปฏิบัติงานของเจ้าหน้าที่",
				ownership_type: "direct",
				channels: [
					{ label: "ยื่นเรื่องด้วยตนเองที่สำนักงานสาธารณสุขอำเภอสอง" },
					{ label: "โทรศัพท์ 054 000 000 ในวันและเวลาราชการ", url: "tel:054000000" },
				],
				eligibility: body("ประชาชนทั่วไปที่ได้รับผลกระทบจากการปฏิบัติงานหรือการให้บริการ"),
				steps: body(
					"กรอกแบบคำร้องเรียนพร้อมรายละเอียดเหตุการณ์",
					"ยื่นแบบคำร้องต่อเจ้าหน้าที่ หรือส่งทางไปรษณีย์",
					"สำนักงานแจ้งผลการพิจารณาให้ผู้ร้องเรียนทราบ",
				),
				required_documents_guidance: body("สำเนาบัตรประจำตัวประชาชน และหลักฐานประกอบ (ถ้ามี)"),
				contact_location_guidance: body(
					"งานบริหารทั่วไป สำนักงานสาธารณสุขอำเภอสอง วันจันทร์–ศุกร์ 08.30–16.30 น.",
				),
				duration: "แจ้งผลภายใน 15 วันทำการ",
				fees: "ไม่มีค่าธรรมเนียม",
				notes: "สำนักงานเก็บข้อมูลผู้ร้องเรียนเป็นความลับ",
			},
			{ documents: ["demo-document-complaint-form"] },
		),
		service("feedback", SERVICE_CATEGORIES.complaints, {
			title: "[ตัวอย่าง] เสนอแนะ / แสดงความคิดเห็น",
			summary: "เสนอแนะเพื่อพัฒนาการให้บริการของสำนักงาน",
			ownership_type: "direct",
		}),
		service("health-problem", SERVICE_CATEGORIES.reports, {
			title: "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ",
			summary: "แจ้งปัญหาสุขภาพในชุมชน เพื่อให้เจ้าหน้าที่ติดตามและประสานการดูแล",
			ownership_type: "coordinated",
			provider_text: "โรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่",
		}),
		service("environment", SERVICE_CATEGORIES.reports, {
			title: "[ตัวอย่าง] แจ้งปัญหาสิ่งแวดล้อมที่กระทบสุขภาพ",
			summary: "แจ้งเหตุรำคาญ กลิ่น ควัน น้ำเสีย หรือขยะที่กระทบสุขภาพของชุมชน",
			ownership_type: "coordinated",
			provider_text: "องค์กรปกครองส่วนท้องถิ่นในพื้นที่",
		}),
		service("flu-vaccine", SERVICE_CATEGORIES.reports, {
			title: "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ่ประจำปี",
			summary: "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที่หน่วยบริการสุขภาพที่เกี่ยวข้อง",
			ownership_type: "related_health_service",
			channels: [{ label: "ติดต่อหน่วยบริการสุขภาพที่ให้บริการด้วยตนเอง" }],
		}),
		service("information-request", SERVICE_CATEGORIES.requests, {
			title: "[ตัวอย่าง] ขอข้อมูลหรือเอกสารจากสำนักงาน",
			summary: "ขั้นตอนและช่องทางการขอข้อมูลข่าวสารของราชการ โดยติดต่อสำนักงานด้วยตนเอง",
			ownership_type: "direct",
		}),
		service("vhv", SERVICE_CATEGORIES.requests, {
			title: "[ตัวอย่าง] บริการสำหรับ อสม.",
			summary: "ข้อมูล แบบฟอร์ม และช่องทางติดต่อสำหรับอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
			ownership_type: "direct",
		}),
		service("general-inquiry", SERVICE_CATEGORIES.requests, {
			title: "[ตัวอย่าง] สอบถามข้อมูลทั่วไป",
			summary: "ช่องทางสอบถามข้อมูลบริการและการติดต่อสำนักงาน",
			ownership_type: "direct",
		}),
		service("health-rights", SERVICE_CATEGORIES.requests, {
			title: "[ตัวอย่าง] ตรวจสอบสิทธิหลักประกันสุขภาพ",
			summary: "ตรวจสอบสิทธิการรักษาพยาบาลของตนเองทางออนไลน์",
			ownership_type: "external_digital",
			provider_text: "สำนักงานหลักประกันสุขภาพแห่งชาติ",
			external_url: "https://www.nhso.go.th/",
		}),
	];

	/** A Health Service in the Areas `areas`, under `demo-health-service-{name}`. */
	const healthService = (
		name: string,
		type: DemoTerm,
		areas: DemoTerm[],
		data: Record<string, unknown>,
		offers: string[] = [],
	): DemoEntry => ({
		collection: "health_services",
		slug: `demo-health-service-${name}`,
		taxonomies: { facility_type: [type.slug], area: areas.map(({ slug }) => slug) },
		references: { offered_services: offers.map((service) => `demo-service-${service}`) },
		publishedAt: ago(60),
		data: { operational_status: "active", ...data },
	});
	const healthServices: DemoEntry[] = [
		healthService(
			"song-hospital",
			FACILITY_TYPES.hospital,
			[AREAS.banKlang],
			{
				title: "[ตัวอย่าง] โรงพยาบาลสอง",
				affiliation_text: "สำนักงานสาธารณสุขจังหวัดแพร่ กระทรวงสาธารณสุข",
				address: "123 หมู่ 1 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
				opening_hours: "ผู้ป่วยนอก จันทร์–ศุกร์ 08.00–16.00 น.\nห้องฉุกเฉิน ทุกวัน 24 ชั่วโมง",
				public_contact: "โทร 054 000 100\nเหตุฉุกเฉิน โทร 1669",
				latitude: 18.4719,
				longitude: 100.1953,
			},
			["flu-vaccine"],
		),
		healthService(
			"ban-klang",
			FACILITY_TYPES.clinic,
			[AREAS.banKlang],
			{
				title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง",
				display_name: "[ตัวอย่าง] รพ.สต.บ้านกลาง",
				affiliation_text: "องค์การบริหารส่วนจังหวัดแพร่",
				address: "45 หมู่ 3 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
				opening_hours: "จันทร์–ศุกร์ 08.30–16.30 น.",
				public_contact: "โทร 054 000 200",
				latitude: 18.4602,
				longitude: 100.1801,
			},
			["flu-vaccine"],
		),
		healthService(
			"sa-iap",
			FACILITY_TYPES.clinic,
			[AREAS.saIap],
			{
				title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลสะเอียบ",
				display_name: "[ตัวอย่าง] รพ.สต.สะเอียบ",
				affiliation_text: "องค์การบริหารส่วนจังหวัดแพร่",
				address: "9 หมู่ 2 ตำบลสะเอียบ อำเภอสอง จังหวัดแพร่ 54120",
				opening_hours: "จันทร์–ศุกร์ 08.30–16.30 น.",
				public_contact: "โทร 054 000 300",
				latitude: 18.6152,
				longitude: 100.2795,
			},
			["flu-vaccine"],
		),
		healthService("huai-mai", FACILITY_TYPES.clinic, [AREAS.huaiMai], {
			title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลห้วยหม้าย",
			display_name: "[ตัวอย่าง] รพ.สต.ห้วยหม้าย",
			operational_status: "temporarily_closed",
			affiliation_text: "องค์การบริหารส่วนจังหวัดแพร่",
			address: "7 หมู่ 5 ตำบลห้วยหม้าย อำเภอสอง จังหวัดแพร่ 54120",
			opening_hours: "ปิดปรับปรุงอาคารชั่วคราว ติดต่อ รพ.สต.บ้านกลางแทน",
			latitude: 18.5011,
			longitude: 100.2207,
		}),
	];

	/** A Health Content item on one Health Topic, under `demo-health-{name}`, with a picture. */
	const healthContent = (
		name: string,
		topic: DemoTerm,
		colours: [string, string],
		publishedDaysAgo: number,
		{
			title,
			summary,
			advice,
			...data
		}: Record<string, unknown> & {
			title: string;
			summary: string;
			advice: string;
		},
	): DemoEntry => ({
		collection: "health_content",
		slug: `demo-health-${name}`,
		taxonomies: { topic: [topic.slug] },
		publishedAt: ago(publishedDaysAgo),
		data: {
			title,
			summary,
			source_text: "กรมควบคุมโรค กระทรวงสาธารณสุข",
			featured_image: picture(`health-${name}`, `ภาพประกอบ ${unmarked(title)}`, ...colours),
			body: body(summary, "## ข้อควรปฏิบัติ", advice),
			...data,
		},
	});
	const healthContents: DemoEntry[] = [
		healthContent("dengue", TOPICS.dengue, ["#bae0cf", "#f2d17a"], 5, {
			title: "[ตัวอย่าง] 3 เก็บ ป้องกัน 3 โรคที่มียุงลายเป็นพาหะ",
			summary:
				"เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวงจรยุงลาย ป้องกันไข้เลือดออก ไข้ซิกา และไข้ปวดข้อยุงลาย",
			advice:
				"หากมีไข้สูงลอย 2 วันขึ้นไป ห้ามกินยาแอสไพรินหรือไอบูโพรเฟน และรีบไปพบเจ้าหน้าที่สาธารณสุข",
		}),
		healthContent("diabetes", TOPICS.ncd, ["#bfdcce", "#e8f0d9"], 11, {
			title: "[ตัวอย่าง] กินอย่างไรให้ห่างไกลโรคเบาหวาน",
			summary: "ลดหวาน มัน เค็ม เพิ่มผักผลไม้ และออกกำลังกายสม่ำเสมออย่างน้อยสัปดาห์ละ 150 นาที",
			advice:
				"ตรวจระดับน้ำตาลในเลือดปีละครั้งเมื่ออายุ 35 ปีขึ้นไป หรือเร็วกว่านั้นหากมีญาติสายตรงเป็นเบาหวาน",
		}),
		healthContent("flu-vaccine", TOPICS.vaccine, ["#d1ebde", "#e8f0cc"], 19, {
			title: "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใครควรได้รับ และรับได้ที่ไหน",
			summary:
				"ผู้สูงอายุ ผู้มีโรคเรื้อรัง และหญิงตั้งครรภ์ควรรับวัคซีนปีละครั้ง ที่โรงพยาบาลส่งเสริมสุขภาพตำบล",
			advice:
				"หลังรับวัคซีนอาจมีไข้ต่ำหรือปวดบริเวณที่ฉีดได้ 1–2 วัน หากมีอาการแพ้รุนแรงให้รีบพบแพทย์",
			reviewed_at: ago(40),
			next_review_at: ahead(325),
		}),
		healthContent("falls", TOPICS.elderly, ["#f0f5fc", "#bfdcce"], 27, {
			title: "[ตัวอย่าง] ป้องกันการหกล้มในผู้สูงอายุ",
			summary: "จัดบ้านให้ปลอดภัย เพิ่มแสงสว่าง ติดราวจับในห้องน้ำ และออกกำลังกายเสริมการทรงตัว",
			advice: "ผู้สูงอายุที่เคยหกล้มในปีที่ผ่านมาควรรับการประเมินความเสี่ยงที่ รพ.สต. ใกล้บ้าน",
		}),
		healthContent("quit-smoking", TOPICS.tobacco, ["#e8f0d9", "#0b6b57"], 34, {
			title: "[ตัวอย่าง] เลิกบุหรี่ได้ เริ่มต้นที่คลินิกใกล้บ้าน",
			summary: "ปรึกษาคลินิกเลิกบุหรี่ที่ รพ.สต. หรือโทรสายด่วนเลิกบุหรี่ 1600 ได้ทุกวัน",
			advice:
				"ตั้งวันเลิกที่ชัดเจน บอกคนใกล้ชิดให้ช่วยสนับสนุน และหลีกเลี่ยงสถานการณ์ที่ทำให้อยากสูบ",
		}),
	];

	/** A Health Report under `demo-report-{name}`, and the Document that holds its content. */
	const healthReport = (
		name: string,
		type: DemoTerm,
		publishedDaysAgo: number,
		{ title, ...data }: { title: string; summary: string } & Record<string, unknown>,
	): DemoEntry[] => [
		document(
			`report-${name}`,
			DOCUMENT_TYPES.report.slug,
			{
				title: `[ตัวอย่าง] เอกสาร${unmarked(title)}`,
				summary: data.summary,
				fiscal_year: data.fiscal_year,
			},
			publishedDaysAgo,
		),
		{
			collection: "health_reports",
			slug: `demo-report-${name}`,
			taxonomies: { report_type: [type.slug] },
			references: { report_document: [`demo-document-report-${name}`] },
			publishedAt: ago(publishedDaysAgo),
			data: { title, owner_source: "สำนักงานสาธารณสุขอำเภอสอง", ...data },
		},
	];
	const healthReports: DemoEntry[] = [
		...healthReport("dengue-q4", REPORT_TYPES.situation, 7, {
			title: "[ตัวอย่าง] รายงานสถานการณ์โรคไข้เลือดออก อำเภอสอง ไตรมาส 4/2569",
			summary: "จำนวนผู้ป่วย อัตราป่วย และการดำเนินงานควบคุมโรคไข้เลือดออกรายตำบล",
			reporting_period: "กรกฎาคม – กันยายน 2569",
			fiscal_year: 2569,
			report_at: ago(8),
		}),
		...healthReport("performance-2569", REPORT_TYPES.performance, 22, {
			title: "[ตัวอย่าง] รายงานผลการดำเนินงานสาธารณสุข อำเภอสอง ปีงบประมาณ 2569",
			summary: "สรุปผลการดำเนินงานตามตัวชี้วัดสำคัญของเครือข่ายบริการสุขภาพอำเภอสอง",
			reporting_period: "ตุลาคม 2568 – กันยายน 2569",
			fiscal_year: 2569,
		}),
		...healthReport("child-vaccine-q3", REPORT_TYPES.situation, 90, {
			title: "[ตัวอย่าง] รายงานความครอบคลุมการได้รับวัคซีนในเด็ก ไตรมาส 3/2569",
			summary: "ความครอบคลุมการได้รับวัคซีนพื้นฐานของเด็กอายุ 1–5 ปี แยกตามหน่วยบริการ",
			reporting_period: "เมษายน – มิถุนายน 2569",
			fiscal_year: 2569,
			report_at: ago(91),
		}),
	];

	/**
	 * A person shown on the About pages, under `demo-person-{name}`. The prefix stays empty, so the
	 * shown name starts with the mark (Product Owner, 2026-10-30: #61 comment 6514145827).
	 */
	const person = (name: string, data: Record<string, unknown>): DemoEntry => ({
		collection: "personnel",
		slug: `demo-person-${name}`,
		publishedAt: ago(90),
		data: { public_visible: true, ...data },
	});
	const units = {
		administration: "กลุ่มงานบริหารทั่วไป",
		prevention: "กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค",
		consumer: "กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข",
	};
	const personnel: DemoEntry[] = [
		person("director", {
			title: "[ตัวอย่าง] สมชาย ใจดี",
			current_assignment: "สาธารณสุขอำเภอสอง",
			organizational_unit: units.administration,
			profile_image: picture("person-director", "ภาพ สมชาย ใจดี", "#bae0cf", "#0b6b57"),
			public_contact: "โทร 054 000 000 ต่อ 101",
			leadership_order: 1,
		}),
		person("deputy", {
			title: "[ตัวอย่าง] วิภาวดี แสงทอง",
			current_assignment: "ผู้ช่วยสาธารณสุขอำเภอสอง",
			organizational_unit: units.prevention,
			profile_image: picture("person-deputy", "ภาพ วิภาวดี แสงทอง", "#f2d17a", "#bfdcce"),
			public_contact: "โทร 054 000 000 ต่อ 102",
			leadership_order: 2,
		}),
		person("general-officer", {
			title: "[ตัวอย่าง] กาญจนา มีสุข",
			current_assignment: "นักจัดการงานทั่วไปชำนาญการ",
			organizational_unit: units.administration,
		}),
		person("health-officer", {
			title: "[ตัวอย่าง] ธนพล รักษ์ดี",
			current_assignment: "นักวิชาการสาธารณสุขชำนาญการ",
			organizational_unit: units.prevention,
			profile_image: picture("person-health-officer", "ภาพ ธนพล รักษ์ดี", "#d1ebde", "#123c33"),
		}),
		person("dental-officer", {
			title: "[ตัวอย่าง] ปิยะพงษ์ ศรีสุข",
			current_assignment: "นักวิชาการสาธารณสุข (ทันตสาธารณสุข)",
			organizational_unit: units.prevention,
		}),
		person("pharmacist", {
			title: "[ตัวอย่าง] เกศินี วงศ์ใหญ่",
			current_assignment: "เภสัชกรชำนาญการ",
			organizational_unit: units.consumer,
			public_contact: "โทร 054 000 000 ต่อ 120",
		}),
	];

	/**
	 * The Basic Pages at the reserved slugs, which /about, /about/organization and the footer show
	 * (src/lib/basic-pages.ts), so their slugs cannot carry the demo prefix.
	 */
	const page = (
		slug: string,
		data: Record<string, unknown>,
		references?: Record<string, string[]>,
	): DemoEntry => ({
		collection: "pages",
		slug,
		...(references ? { references } : {}),
		publishedAt: ago(100),
		data,
	});
	const pages: DemoEntry[] = [
		page(
			"about",
			{
				title: "[ตัวอย่าง] เกี่ยวกับสำนักงานสาธารณสุขอำเภอสอง",
				summary:
					"สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่ ดูแลงานสาธารณสุขและประสานเครือข่ายบริการสุขภาพในอำเภอสอง",
				body: body(
					"## หน้าที่และอำนาจ",
					"ประสานงานและสนับสนุนการดำเนินงานด้านสาธารณสุขของโรงพยาบาลส่งเสริมสุขภาพตำบลในพื้นที่ ส่งเสริมสุขภาพ ป้องกันและควบคุมโรค และคุ้มครองผู้บริโภคด้านสุขภาพ",
					"## พื้นที่รับผิดชอบ",
					"ครอบคลุม 8 ตำบลของอำเภอสอง จังหวัดแพร่ ร่วมกับโรงพยาบาลสองและโรงพยาบาลส่งเสริมสุขภาพตำบลทุกแห่ง",
					"## วิสัยทัศน์",
					"ประชาชนอำเภอสองมีสุขภาพดี ด้วยระบบบริการสุขภาพที่มีคุณภาพและการมีส่วนร่วมของชุมชน",
				),
			},
			{ documents: ["demo-document-policy-2570", "demo-document-plan-2570"] },
		),
		page("organization", {
			title: "[ตัวอย่าง] โครงสร้างองค์กร",
			summary: "การแบ่งส่วนงานภายในของสำนักงานสาธารณสุขอำเภอสอง",
			body: body(
				"## กลุ่มงานบริหารทั่วไป",
				"งานธุรการ การเงินและบัญชี พัสดุ และบริหารงานบุคคล",
				"## กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค",
				"งานส่งเสริมสุขภาพทุกกลุ่มวัย งานควบคุมโรคติดต่อและโรคไม่ติดต่อ และงานทันตสาธารณสุข",
				"## กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข",
				"งานคุ้มครองผู้บริโภคด้านผลิตภัณฑ์สุขภาพและสถานประกอบการ",
			),
		}),
		page("privacy", {
			title: "[ตัวอย่าง] นโยบายความเป็นส่วนตัว",
			summary: "วิธีที่เว็บไซต์นี้ดูแลข้อมูลของผู้เข้าชม",
			body: body(
				"เว็บไซต์นี้ไม่ใช้คุกกี้ติดตามและไม่ส่งข้อมูลการเข้าชมให้บุคคลภายนอก",
				"## การติดต่อสำนักงาน",
				"ข้อมูลส่วนบุคคลที่ท่านให้เมื่อติดต่อสำนักงาน ใช้เพื่อดำเนินการตามคำขอของท่านเท่านั้น",
			),
		}),
		page("accessibility", {
			title: "[ตัวอย่าง] การเข้าถึงเว็บไซต์",
			summary: "แนวทางการออกแบบเว็บไซต์ให้ทุกคนใช้งานได้",
			body: body(
				"เว็บไซต์นี้ออกแบบให้สอดคล้องกับ WCAG 2.2 ระดับ AA ใช้งานได้ด้วยแป้นพิมพ์และโปรแกรมอ่านหน้าจอ",
				"หากพบปัญหาในการใช้งาน โปรดแจ้งสำนักงานผ่านช่องทางติดต่อ",
			),
		}),
	];

	const activities: DemoEntry[] = [
		{
			collection: "activities",
			slug: "demo-activity-elderly-screening",
			publishedAt: ago(3),
			data: {
				title: "[ตัวอย่าง] ลงพื้นที่คัดกรองภาวะหกล้มและสมองเสื่อมในผู้สูงอายุ ตำบลบ้านกลาง",
				summary:
					"ทีมสาธารณสุขอำเภอร่วมกับ อสม. คัดกรองผู้สูงอายุ 120 คน และแนะนำการจัดบ้านให้ปลอดภัย",
				activity_at: ago(4),
				location_text: "ศาลาอเนกประสงค์ หมู่ 4 ตำบลบ้านกลาง",
				participants_text: "เจ้าหน้าที่ รพ.สต.บ้านกลาง อสม. และผู้สูงอายุในตำบล",
				featured_image: picture(
					"activity-elderly-screening",
					"ภาพกิจกรรมคัดกรองผู้สูงอายุ ตำบลบ้านกลาง",
					"#bfdcce",
					"#e8f0d9",
				),
				gallery: [
					{
						image: picture(
							"activity-elderly-registration",
							"ผู้สูงอายุลงทะเบียนรับการคัดกรอง",
							"#bae0cf",
							"#f2d17a",
						),
						caption: "ผู้สูงอายุลงทะเบียนก่อนรับการคัดกรอง",
					},
					{
						image: picture(
							"activity-elderly-balance",
							"เจ้าหน้าที่ทดสอบการทรงตัวของผู้สูงอายุ",
							"#d1ebde",
							"#e8f0cc",
						),
						caption: "ทดสอบการทรงตัวเพื่อประเมินความเสี่ยงการหกล้ม",
					},
					{
						image: picture(
							"activity-elderly-advice",
							"อสม. แนะนำการจัดบ้านให้ปลอดภัย",
							"#bfdcce",
							"#f2d17a",
						),
					},
				],
			},
		},
		{
			collection: "activities",
			slug: "demo-activity-district-board",
			publishedAt: ago(9),
			data: {
				title: "[ตัวอย่าง] ประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอสอง ครั้งที่ 4/2569",
				summary: "หัวหน้าส่วนราชการและผู้นำชุมชนร่วมติดตามแผนพัฒนาคุณภาพชีวิตด้านสุขภาพของอำเภอ",
				activity_at: ago(10),
				location_text: "ห้องประชุมที่ว่าการอำเภอสอง",
				participants_text: "นายอำเภอสอง หัวหน้าส่วนราชการ ผู้อำนวยการ รพ.สต. และผู้นำชุมชน",
				featured_image: picture(
					"activity-district-board",
					"ภาพการประชุมคณะกรรมการพัฒนาคุณภาพชีวิตระดับอำเภอ",
					"#d1ebde",
					"#f2d17a",
				),
			},
		},
		{
			collection: "activities",
			slug: "demo-activity-vhv-training",
			publishedAt: ago(16),
			data: {
				title: "[ตัวอย่าง] อบรมฟื้นฟูความรู้ อสม. ด้านการเฝ้าระวังโรคติดต่อในชุมชน",
				summary: "ทบทวนแนวทางการเฝ้าระวังและรายงานโรคติดต่อสำหรับอาสาสมัครสาธารณสุขประจำหมู่บ้าน",
				activity_at: ago(17),
				location_text: "ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง",
				participants_text: "อสม. จาก 8 ตำบล จำนวน 60 คน",
			},
		},
		{
			collection: "activities",
			slug: "demo-activity-school-dental",
			publishedAt: ago(24),
			data: {
				title: "[ตัวอย่าง] ตรวจสุขภาพช่องปากและเคลือบฟลูออไรด์นักเรียนชั้นประถมศึกษา",
				summary: "ทันตบุคลากรตรวจฟันและสอนแปรงฟันที่ถูกวิธีให้นักเรียนโรงเรียนในเขตอำเภอสอง",
				activity_at: ago(25),
				location_text: "โรงเรียนบ้านสะเอียบ",
				featured_image: picture(
					"activity-school-dental",
					"ภาพกิจกรรมตรวจสุขภาพช่องปากนักเรียน",
					"#bae0cf",
					"#e8f0d9",
				),
			},
		},
	];

	const entries = [
		...documents,
		...news,
		...announcements,
		...activities,
		...services,
		...healthServices,
		...healthContents,
		...healthReports,
		...personnel,
		...pages,
	];
	/** A menu item for the dataset's entry `slug`, labelled with its title as the picker does. */
	const picked = (slug: string): DemoMenuItem => ({
		label: String(entries.find((entry) => entry.slug === slug)!.data.title),
		entry: slug,
	});

	return {
		terms: [
			...Object.values(TOPICS),
			...Object.values(NEWS_CATEGORIES),
			...Object.values(DOCUMENT_TYPES),
			...Object.values(ANNOUNCEMENT_TYPES),
			...Object.values(SERVICE_CATEGORIES),
			...Object.values(AREAS),
			...Object.values(FACILITY_TYPES),
			...Object.values(REPORT_TYPES),
		],
		media,
		entries,
		menus: {
			"homepage-featured": [picked("demo-news-ncd-screening")],
			"homepage-services": [
				"complaint",
				"feedback",
				"health-problem",
				"information-request",
				"vhv",
				"general-inquiry",
			].map((name) => picked(`demo-service-${name}`)),
			// The shortcuts the Homepage starts with (Product Owner, 2026-10-29;
			// docs/design/homepage-concept-v1.md §10).
			"homepage-quick-access": [
				{ label: "เอกสารเผยแพร่", url: "/documents" },
				{ label: "ข้อมูลสุขภาพ", url: "/health" },
			],
		},
		officeContact: {
			address: "[ตัวอย่าง] 99 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120",
			telephone: "054 000 000",
			email: "contact@example.invalid",
			opening_hours: "จันทร์–ศุกร์ 08.30–16.30 น.\nเว้นวันหยุดราชการ",
			latitude: 18.4686,
			longitude: 100.1834,
			line_url: "https://lin.ee/example",
		},
		social: { facebook: "example.songhealth", youtube: "@example-songhealth" },
	};
}

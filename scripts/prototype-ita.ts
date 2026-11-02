// PROTOTYPE (throwaway, branch prototype/ita): the ITA re-entry grill's Admin questions (Q6, Q15,
// Q16): does EmDash 1.1.0's blocks field give ITA staff a workable Evidence editor? The command
// installs a temporary MOIT collection ("proto_moit") with three block types, five sample PDFs and
// two sample MOITs of fiscal year 2570 on the development runtime, or takes them away. The pages
// that show the sample are src/pages/prototype/ita/. Nothing here is production code.
//
//   scripts/dev-runtime-env.sh node scripts/prototype-ita.ts add
//   scripts/dev-runtime-env.sh node scripts/prototype-ita.ts remove
//
// `add` creates what is missing, so it can run again. `remove` deletes the collection with its
// entries (DELETE /_emdash/api/schema/collections/{slug}?force=true) and the sample PDFs. EmDash
// 1.1.0 has no route that deletes a block type (src/astro/routes/api/schema/block-types/[slug]/
// index.ts has GET and PUT), so `remove` prints the SQL that removes the three prototype block
// types from the development database; the versions cascade (migrations/083_block_types.ts).
//
// The commands act as the development Administrator through the PAT that SONGHEALTH_DEV_ACCESS
// names (cms.helpers.ts devAdminActor); the PAT is never printed.

import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

import { escapeHtml } from "../src/lib/search-matcher.ts";
import * as helpers from "../tests/browser/cms.helpers.ts";

const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";
const USAGE = "usage: node scripts/prototype-ita.ts add|remove";

const COLLECTION = "proto_moit";
const FILE_PREFIX = "proto-ita-";
const CATEGORY = "ITA (ต้นแบบ)";
const ROUNDS = ["รอบ 6 เดือน", "รอบ 12 เดือน"];

const BLOCK_TYPES = [
	{
		slug: "proto_ita_requirement",
		label: "ข้อกำหนด",
		description: "หัวข้อข้อกำหนดของ MOIT เช่น 1. หรือ 1.1 หลักฐานที่ตามมาอยู่ใต้ข้อนี้",
		icon: "list-ordered",
		category: CATEGORY,
		fields: [
			{ slug: "number", label: "ข้อ", type: "string", required: true },
			{ slug: "title", label: "ชื่อข้อกำหนด", type: "text", required: true },
		],
	},
	{
		slug: "proto_ita_file",
		label: "หลักฐาน: ไฟล์",
		description: "ไฟล์จากคลังสื่อ เช่น บันทึกเสนอ ผบห. เอกสาร หรือฟอร์มเผยแพร่",
		icon: "file-text",
		category: CATEGORY,
		fields: [
			{ slug: "label", label: "ชื่อหลักฐาน", type: "string", required: true },
			{ slug: "file", label: "ไฟล์", type: "file", required: true },
			{ slug: "round", label: "รอบการประเมิน", type: "select", validation: { options: ROUNDS } },
			{ slug: "note", label: "หมายเหตุ", type: "string" },
		],
	},
	{
		slug: "proto_ita_link",
		label: "หลักฐาน: ลิงก์",
		description: "หน้าเว็บของสำนักงานหรือเว็บไซต์ภายนอก",
		icon: "link",
		category: CATEGORY,
		fields: [
			{ slug: "label", label: "ชื่อหลักฐาน", type: "string", required: true },
			{ slug: "url", label: "ที่อยู่เว็บ", type: "url", required: true },
			{ slug: "round", label: "รอบการประเมิน", type: "select", validation: { options: ROUNDS } },
			{ slug: "current", label: "ข้อมูลปัจจุบัน (เปลี่ยนตามเวลา)", type: "boolean" },
		],
	},
];

const COLLECTION_BODY = {
	slug: COLLECTION,
	label: "MOIT (ต้นแบบ)",
	labelSingular: "MOIT (ต้นแบบ)",
	description: "ต้นแบบชั่วคราวสำหรับทดลองหน้าจอ ITA ไม่ใช่เนื้อหาจริง",
	supports: ["drafts", "revisions", "preview", "scheduling"],
	urlPattern: "/prototype/ita/{fiscal_year}/{slug}",
	routable: true,
	group: CATEGORY,
};

const FIELDS = [
	{ slug: "title", label: "ชื่อตัวชี้วัด", type: "string", required: true },
	{ slug: "fiscal_year", label: "ปีงบประมาณ", type: "integer", required: true },
	{ slug: "number", label: "ลำดับ MOIT", type: "integer", required: true },
	{ slug: "summary", label: "คำอธิบาย", type: "text" },
	{ slug: "updated_on", label: "ปรับปรุงล่าสุด", type: "datetime" },
	{
		slug: "evidence",
		label: "ข้อกำหนดและหลักฐาน",
		type: "blocks",
		validation: { allowedTypes: BLOCK_TYPES.map((type) => type.slug), maxItems: 100 },
	},
];

/** The sample PDFs, by the role each plays in the evidence. */
const PDFS = {
	memo: "บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน",
	document: "เอกสารหลักฐาน (ตัวอย่าง)",
	form: "แบบฟอร์มการขอเผยแพร่ข้อมูลผ่านเว็บไซต์ของหน่วยงาน",
	report: "รายงานผลการดำเนินงาน (ตัวอย่าง)",
	// Uploaded, linked from MOIT 1 item 2.3, then deleted: the page's unavailable state (Q16).
	missing: "ฟอร์มเผยแพร่ที่ถูกลบออกจากคลังสื่อ",
};
type Pdf = keyof typeof PDFS;

type Line =
	| { r: string; t: string }
	| { f: string; pdf: Pdf; round?: 0 | 1; note?: string }
	| { l: string; url: string; round?: 0 | 1; current?: boolean };

interface Sample {
	slug: string;
	title: string;
	number: number;
	summary: string;
	lines: Line[];
}

const YEAR = 2570;

/** The 2570 samples follow the legacy site's 2569 MOIT 1 and MOIT 2 (docs/research/legacy-ita.md). */
const SAMPLES: Sample[] = [
	{
		slug: `moit-1-${YEAR}`,
		number: 1,
		title:
			"หน่วยงานมีการวางระบบโดยการกำหนดมาตรการการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงาน",
		summary:
			"คำสั่งหรือประกาศที่กำหนดกรอบแนวทางการเผยแพร่ข้อมูล และรายงานการกำกับติดตามของปีที่ผ่านมา",
		lines: [
			{ r: "1", t: "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง (ของปีงบประมาณ พ.ศ. 2570)" },
			{ f: "1.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", pdf: "memo" },
			{ f: "1.2 คำสั่ง / ประกาศ โดย ผบห.สูงสุดของหน่วยงาน", pdf: "document" },
			{ f: "1.3 กรอบแนวทางการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงาน", pdf: "document" },
			{ f: "1.4 ฟอร์มเผยแพร่", pdf: "form" },
			{
				r: "2",
				t: "รายงานการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงานในปีที่ผ่านมา (ของปีงบประมาณ พ.ศ. 2569)",
			},
			{ f: "2.1 บันทึกข้อความเสนอ ผบห. และขออนุญาตนำเผยแพร่บนเว็บไซต์ของหน่วยงาน", pdf: "memo" },
			{ f: "2.2 รายงานผลการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะปีที่ผ่านมา", pdf: "report" },
			{ f: "2.3 ฟอร์มเผยแพร่", pdf: "missing" },
		],
	},
	{
		slug: `moit-2-${YEAR}`,
		number: 2,
		title: "หน่วยงานมีการเปิดเผยข้อมูลข่าวสารที่เป็นปัจจุบัน",
		summary:
			"ข้อมูลพื้นฐาน กฎหมายและแผนที่เกี่ยวข้อง แผนและผลการดำเนินงาน คู่มือ และข้อมูลการจัดซื้อจัดจ้าง",
		lines: [
			{ r: "1", t: "ข้อมูลพื้นฐานที่เป็นปัจจุบัน" },
			{ l: "1.1 ข้อมูลผู้บริหาร แสดงรายนาม", url: "/about/leadership", current: true },
			{ f: "1.2 นโยบายของผู้บริหาร", pdf: "document" },
			{ f: "1.3 โครงสร้างหน่วยงาน", pdf: "document" },
			{
				f: "1.4 หน้าที่และอำนาจของหน่วยงานตามกฎหมายจัดตั้งหรือกฎหมายอื่นที่เกี่ยวข้อง",
				pdf: "document",
			},
			{
				l: "1.5 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน หรือการปฏิบัติงานของหน่วยงาน",
				url: "https://stopcorruption.moph.go.th/",
			},
			{ l: "1.6 ข่าวประชาสัมพันธ์ ที่เกิดขึ้นในปีงบประมาณ พ.ศ. 2570", url: "/news", current: true },
			{ l: "1.7 ข้อมูลการติดต่อหน่วยงาน", url: "/contact", current: true },
			{
				f: "1.8 ช่องทางการรับฟังความคิดเห็นที่บุคคลภายนอกสามารถแสดงความคิดเห็นต่อการดำเนินงานตามหน้าที่และอำนาจและตามภารกิจของหน่วยงาน",
				pdf: "document",
			},
			{ r: "2", t: "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH" },
			{ f: "วิสัยทัศน์ พันธกิจ ค่านิยม MOPH", pdf: "document" },
			{ r: "3", t: "พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ. 2562" },
			{ f: "พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ. 2562", pdf: "document" },
			{ r: "4", t: "ประมวลจริยธรรมข้าราชการพลเรือน พ.ศ. 2564" },
			{ f: "ประมวลจริยธรรมข้าราชการพลเรือน พ.ศ. 2564", pdf: "document" },
			{ r: "5", t: "ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐ สำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564" },
			{
				f: "ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐ สำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564",
				pdf: "document",
			},
			{ r: "6", t: "ยุทธศาสตร์ชาติ จำนวน 3 ระดับ" },
			{ f: "6.1 แผนระดับที่ 1 ยุทธศาสตร์ชาติ พ.ศ. 2561 – 2580", pdf: "document" },
			{ r: "6.2", t: "แผนระดับที่ 2" },
			{
				f: "แผนแม่บทภายใต้ยุทธศาสตร์ชาติ (พ.ศ. 2566 – 2580) (ฉบับแก้ไขเพิ่มเติม)",
				pdf: "document",
			},
			{ f: "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13 (พ.ศ. 2566 – 2570)", pdf: "document" },
			{ f: "นโยบายและแผนระดับชาติว่าด้วยความมั่นคงแห่งชาติ (พ.ศ. 2566 – 2570)", pdf: "document" },
			{
				r: "6.3",
				t: "แผนระดับที่ 3 ที่เกี่ยวข้องกับการต่อต้านการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม",
			},
			{
				f: "แผนปฏิบัติการด้านการต่อต้านการทุจริตและประพฤติมิชอบ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
				pdf: "document",
			},
			{
				f: "แผนปฏิบัติการด้านการส่งเสริมคุณธรรมแห่งชาติ ระยะที่ 2 (พ.ศ. 2566 – 2570)",
				pdf: "document",
			},
			{
				f: "ยุทธศาสตร์ด้านมาตรฐานทางจริยธรรมและการส่งเสริมจริยธรรมภาครัฐ (พ.ศ. 2565 – 2570)",
				pdf: "document",
			},
			{
				r: "7",
				t: "แผนปฏิบัติราชการด้านการป้องกันปราบปรามการทุจริตและประพฤติมิชอบ และการส่งเสริมคุณธรรม จริยธรรม ของกระทรวงสาธารณสุข",
			},
			{
				f: "7.1 แผนปฏิบัติราชการด้านการป้องกัน ปราบปรามการทุจริตและประพฤติมิชอบ กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
				pdf: "document",
			},
			{
				f: "7.2 แผนปฏิบัติราชการด้านส่งเสริมคุณธรรม จริยธรรม กระทรวงสาธารณสุข ระยะที่ 2 (พ.ศ. 2566 – 2570)",
				pdf: "document",
			},
			{ r: "8", t: "นโยบายและยุทธศาสตร์ของหน่วยงาน" },
			{ f: "นโยบายและยุทธศาสตร์ของหน่วยงาน", pdf: "document" },
			{ r: "9", t: "แผนปฏิบัติการประจำปีของหน่วยงาน (ทุกแผน)" },
			{ f: "แผนปฏิบัติการประจำปีของหน่วยงาน", pdf: "document" },
			{ r: "10", t: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปีของหน่วยงาน (ตามข้อ 9)" },
			{ f: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี", pdf: "report", round: 0 },
			{ f: "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี", pdf: "report", round: 1 },
			{
				r: "11",
				t: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน และผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน",
			},
			{ f: "แผนการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "document", round: 0 },
			{ f: "ผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "report", round: 0 },
			{ f: "แผนและผลการใช้จ่ายงบประมาณประจำปีของหน่วยงาน", pdf: "report", round: 1 },
			{ r: "12", t: "คู่มือการปฏิบัติงานการร้องเรียนการปฏิบัติงานหรือให้บริการของเจ้าหน้าที่" },
			{
				f: "คู่มือการปฏิบัติงานการร้องเรียนการปฏิบัติงานหรือให้บริการของเจ้าหน้าที่",
				pdf: "document",
			},
			{ r: "13", t: "คู่มือการปฏิบัติงานการร้องเรียนการทุจริตและประพฤติมิชอบ" },
			{ f: "คู่มือการปฏิบัติงานการร้องเรียนการทุจริตและประพฤติมิชอบ", pdf: "document" },
			{ r: "14", t: "คู่มือการปฏิบัติงานตามภารกิจหลักและสนับสนุนของหน่วยงาน" },
			{ f: "คู่มือการปฏิบัติงานตามภารกิจหลักและสนับสนุนของหน่วยงาน", pdf: "document" },
			{
				r: "15",
				t: "คู่มือขั้นตอนการให้บริการ (ภารกิจให้บริการประชาชนตามพระราชบัญญัติการอำนวยความสะดวกในการพิจารณาอนุญาตของทางราชการ พ.ศ. 2558)",
			},
			{
				l: "คู่มือขั้นตอนการให้บริการ (อย.)",
				url: "https://www.fda.moph.go.th/fda-service-manual",
			},
			{
				r: "16",
				t: "รายงานผลการดำเนินงานเกี่ยวกับเรื่องร้องเรียนการปฏิบัติงานหรือการให้บริการ (รอบ 12 เดือน ปีงบประมาณ พ.ศ. 2569)",
			},
			{
				f: "รายงานผลการดำเนินงานเกี่ยวกับเรื่องร้องเรียนการปฏิบัติงานหรือการให้บริการ",
				pdf: "report",
			},
			{
				r: "17",
				t: "รายงานผลการดำเนินการเกี่ยวกับเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ (รอบ 12 เดือน ปีงบประมาณ พ.ศ. 2569)",
			},
			{ f: "รายงานผลการดำเนินการเกี่ยวกับเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", pdf: "report" },
			{ r: "18", t: "ข้อมูลการจัดซื้อจัดจ้าง" },
			{
				f: "18.1 การวิเคราะห์ผลการจัดซื้อจัดจ้างและการจัดหาพัสดุของปีงบประมาณ พ.ศ. 2569",
				pdf: "report",
			},
			{ f: "18.2 แผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570", pdf: "document" },
			{
				r: "18.3",
				t: "ผลการดำเนินการตามแผนการจัดซื้อจัดจ้างและการจัดหาพัสดุ ประจำปีงบประมาณ พ.ศ. 2570 ตามรอบระยะเวลาที่กำหนดในกรอบแนวทางของหน่วยงาน",
			},
			{ f: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", pdf: "report", round: 0 },
			{ f: "ผลการดำเนินงานตามแผน (บันทึก + แบบรายงาน + ฟอร์มเผยแพร่)", pdf: "report", round: 1 },
			{
				r: "18.4",
				t: "ประกาศสำนักงานปลัดกระทรวงสาธารณสุขว่าด้วยแนวทางปฏิบัติงานเพื่อตรวจสอบบุคลากรในหน่วยงานด้านการจัดซื้อจัดจ้าง พ.ศ. 2560",
			},
			{
				f: "ประกาศสำนักงานปลัดกระทรวงสาธารณสุขว่าด้วยแนวทางปฏิบัติงานเพื่อตรวจสอบบุคลากรในหน่วยงานด้านการจัดซื้อจัดจ้าง พ.ศ. 2560",
				pdf: "document",
			},
			{ f: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างไม่เกิน 100,000 บาท", pdf: "form" },
			{ f: "แบบแสดงความบริสุทธิ์ใจในการจัดซื้อจัดจ้างเกิน 100,000 บาท", pdf: "form" },
		],
	},
];

/** A media item as the native media API lists or uploads it. */
interface MediaItem {
	id: string;
	filename: string;
	mimeType: string;
	size: number | null;
	storageKey: string;
}

/** One native request; a refusal throws with what was being done. */
async function must(
	admin: helpers.CmsActor,
	doing: string,
	path: string,
	options?: helpers.CmsRequestOptions,
): Promise<helpers.NativeResult> {
	const result = await helpers.cmsRequest(admin, path, options ?? {});
	if (!result.ok) {
		const error = helpers.nativeErrorOf(result);
		throw new Error(
			`${doing}: ${helpers.nativeRefusalOf(result)} ${error?.message ?? ""} ${JSON.stringify(error?.details ?? "")}`,
		);
	}
	return result;
}

/** Print one-page A4 PDFs in the site's Noto Sans Thai, as the demo dataset does (#66). */
async function printPdfs(keys: Pdf[]): Promise<Map<Pdf, Uint8Array<ArrayBuffer>>> {
	const regular = await readFile(
		new URL("../src/assets/fonts/NotoSansThai-Regular.woff2", import.meta.url),
	);
	const css = `@font-face { font-family: T; src: url(data:font/woff2;base64,${regular.toString("base64")}) format("woff2"); }
body { font-family: T; padding: 64px; color: #123c33; } h1 { font-size: 22pt; } p { font-size: 14pt; line-height: 1.6; }
.mark { display: inline-block; border: 2px solid #0b6b57; border-radius: 8px; padding: 4px 12px; color: #0b6b57; }`;
	const browser = await chromium.launch();
	const printed = new Map<Pdf, Uint8Array<ArrayBuffer>>();
	try {
		const page = await browser.newPage();
		for (const key of keys) {
			await page.setContent(
				`<!doctype html><html lang="th"><meta charset="utf-8"><style>${css}</style>
<p class="mark">เอกสารตัวอย่างของต้นแบบ ITA — ไม่ใช่เอกสารราชการจริง</p><h1>${escapeHtml(PDFS[key])}</h1>
<p>สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่ · ปีงบประมาณ พ.ศ. ${YEAR}</p>`,
				{ waitUntil: "load" },
			);
			await page.evaluate(() => document.fonts.ready.then(() => undefined));
			printed.set(key, new Uint8Array(await page.pdf({ format: "A4" })));
		}
	} finally {
		await browser.close();
	}
	return printed;
}

function blocksOf(lines: Line[], files: Map<Pdf, MediaItem>): Record<string, unknown>[] {
	return lines.map((line) => {
		if ("r" in line) return { _type: "proto_ita_requirement", number: line.r, title: line.t };
		const round = line.round === undefined ? {} : { round: ROUNDS[line.round] };
		if ("f" in line) {
			const file = files.get(line.pdf);
			if (!file) throw new Error(`no uploaded PDF for ${line.pdf}`);
			return {
				_type: "proto_ita_file",
				label: line.f,
				file: helpers.fileFieldValue(file),
				...round,
				...(line.note ? { note: line.note } : {}),
			};
		}
		return {
			_type: "proto_ita_link",
			label: line.l,
			url: line.url,
			...round,
			current: line.current === true,
		};
	});
}

async function listMedia(admin: helpers.CmsActor): Promise<MediaItem[]> {
	const items = await helpers.listNativeItems(admin, "/_emdash/api/media");
	return items as unknown as MediaItem[];
}

async function ensureModel(admin: helpers.CmsActor): Promise<void> {
	const types = await must(admin, "listing the block types", "/_emdash/api/schema/block-types");
	const typeSlugs = new Set(
		(helpers.nativeItemsOf(types) as { slug: string }[]).map((t) => t.slug),
	);
	for (const type of BLOCK_TYPES) {
		if (typeSlugs.has(type.slug)) continue;
		await must(admin, `creating block type ${type.slug}`, "/_emdash/api/schema/block-types", {
			method: "POST",
			body: type,
		});
		console.log(`created block type ${type.slug}`);
	}
	const collections = await must(
		admin,
		"listing the collections",
		"/_emdash/api/schema/collections",
	);
	const slugs = (helpers.nativeItemsOf(collections) as { slug: string }[]).map((c) => c.slug);
	if (!slugs.includes(COLLECTION)) {
		await must(admin, `creating collection ${COLLECTION}`, "/_emdash/api/schema/collections", {
			method: "POST",
			body: COLLECTION_BODY,
		});
		console.log(`created collection ${COLLECTION}`);
	}
	const fieldsPath = `/_emdash/api/schema/collections/${COLLECTION}/fields`;
	const fields = await must(admin, "listing the fields", fieldsPath);
	const fieldSlugs = new Set(
		(helpers.nativeItemsOf(fields) as { slug: string }[]).map((f) => f.slug),
	);
	for (const field of FIELDS) {
		if (fieldSlugs.has(field.slug)) continue;
		await must(admin, `creating field ${field.slug}`, fieldsPath, { method: "POST", body: field });
		console.log(`created field ${COLLECTION}.${field.slug}`);
	}
}

async function ensureFiles(admin: helpers.CmsActor, keys: Pdf[]): Promise<Map<Pdf, MediaItem>> {
	const files = new Map<Pdf, MediaItem>();
	const existing = await listMedia(admin);
	const wanted = keys.filter((key) => {
		const item = existing.find((media) => media.filename === `${FILE_PREFIX}${key}.pdf`);
		if (item) files.set(key, item);
		return !item;
	});
	if (wanted.length === 0) return files;
	const printed = await printPdfs(wanted);
	for (const key of wanted) {
		const item = await helpers.uploadMediaItem(
			admin,
			`${FILE_PREFIX}${key}.pdf`,
			{ bytes: printed.get(key)!, type: "application/pdf" },
			PDFS[key],
		);
		files.set(key, item as unknown as MediaItem);
		console.log(`uploaded ${FILE_PREFIX}${key}.pdf`);
	}
	return files;
}

async function add(admin: helpers.CmsActor): Promise<void> {
	await ensureModel(admin);
	const entries = await helpers.listNativeItems(admin, `/_emdash/api/content/${COLLECTION}`);
	const present = new Set(entries.map((entry) => entry.slug));
	const missing = SAMPLES.filter((sample) => !present.has(sample.slug));
	if (missing.length === 0) {
		console.log("the sample MOITs are already there");
		return;
	}
	const keys = new Set<Pdf>();
	for (const sample of missing) {
		for (const line of sample.lines) if ("f" in line) keys.add(line.pdf);
	}
	const files = await ensureFiles(admin, [...keys]);
	for (const sample of missing) {
		const created = await helpers.createSyntheticEntry(admin, COLLECTION, {
			slug: sample.slug,
			data: {
				title: sample.title,
				fiscal_year: YEAR,
				number: sample.number,
				summary: sample.summary,
				updated_on: new Date().toISOString(),
				evidence: blocksOf(sample.lines, files),
			},
		});
		if (!created.entryId) {
			throw new Error(`creating ${sample.slug}: ${helpers.nativeRefusalOf(created.result)}`);
		}
		const published = await helpers.publishEntry(admin, COLLECTION, created.entryId);
		if (!published.ok) {
			throw new Error(`publishing ${sample.slug}: ${helpers.nativeRefusalOf(published)}`);
		}
		console.log(`published ${sample.slug} with ${sample.lines.length} blocks`);
	}
	const gone = files.get("missing");
	if (gone) {
		const deleted = await helpers.deleteMedia(admin, gone.id);
		if (!deleted.ok)
			throw new Error(`deleting the missing-file sample: ${helpers.nativeRefusalOf(deleted)}`);
		console.log(`deleted ${gone.filename} again, so MOIT 1 item 2.3 shows the unavailable state`);
	}
	console.log(`\nAdmin: ${ORIGIN}/_emdash/collections/${COLLECTION}`);
	console.log(`Pages: ${ORIGIN}/prototype/ita`);
}

async function remove(admin: helpers.CmsActor): Promise<void> {
	const collections = await must(
		admin,
		"listing the collections",
		"/_emdash/api/schema/collections",
	);
	const slugs = (helpers.nativeItemsOf(collections) as { slug: string }[]).map((c) => c.slug);
	if (slugs.includes(COLLECTION)) {
		await must(
			admin,
			`deleting collection ${COLLECTION}`,
			`/_emdash/api/schema/collections/${COLLECTION}`,
			{ method: "DELETE", searchParams: { force: "true" } },
		);
		console.log(`deleted collection ${COLLECTION} with its entries`);
	}
	for (const item of await listMedia(admin)) {
		if (!item.filename.startsWith(FILE_PREFIX)) continue;
		const deleted = await helpers.deleteMedia(admin, item.id);
		if (!deleted.ok)
			throw new Error(`deleting ${item.filename}: ${helpers.nativeRefusalOf(deleted)}`);
		console.log(`deleted ${item.filename}`);
	}
	const list = BLOCK_TYPES.map((type) => `'${type.slug}'`).join(", ");
	console.log(
		`\nEmDash 1.1.0 cannot delete a block type through its API. To remove the prototype's:`,
	);
	console.log(`  DELETE FROM _emdash_block_types WHERE slug IN (${list});`);
}

async function main(args: string[]): Promise<number> {
	const command = args[0];
	if (args.length !== 1 || (command !== "add" && command !== "remove")) {
		console.error(USAGE);
		return 2;
	}
	const admin = await helpers.devAdminActor(ORIGIN);
	if (command === "add") await add(admin);
	else await remove(admin);
	return 0;
}

process.exitCode = await main(process.argv.slice(2));

// PROTOTYPE (throwaway, branch prototype/design): Feature 006's design variants (grill
// 2026-11-04, Q9). Three variants of the public site's look, switchable via `?variant=1|2|3`, and
// two ways to show a One Page, switchable via `?onepage=frame|text` (Q7, Q13), on the existing
// routes: the Homepage, /activities, an Activity page, /documents and the shell with the mobile
// menu (Q10). `?variant=0` is the current design (`main` e5fd8a6), for comparison.
//
// The middleware (src/middleware.ts) keeps the last choice in two cookies, so a reviewer who
// follows a link stays in the same variant. The address wins over the cookie. Nothing here is
// production code: the chosen variant is rebuilt properly from the spec.

import { formatThaiDate } from "./thai-date";

/** The variants, in switcher order. */
export const VARIANTS = [
	{ key: "0", name: "ปัจจุบัน" },
	{ key: "1", name: "ต่อยอด Concept v1" },
	{ key: "2", name: "หน่วยงานราชการ" },
	{ key: "3", name: "ชุมชน เน้นภาพ" },
	{ key: "4", name: "ปัจจุบัน + แก้จุด" },
] as const;

export type Variant = (typeof VARIANTS)[number]["key"];

/** How a card shows a One Page: whole in a portrait frame, or text first with a small one. */
export const ONEPAGE_MODES = [
	{ key: "frame", name: "One Page แบบกรอบภาพ" },
	{ key: "text", name: "One Page แบบเน้นข้อความ" },
] as const;

export type OnePageMode = (typeof ONEPAGE_MODES)[number]["key"];

export const VARIANT_PARAM = "variant";
export const ONEPAGE_PARAM = "onepage";
export const VARIANT_COOKIE = "proto_design_variant";
export const ONEPAGE_COOKIE = "proto_design_onepage";

/** The variant when neither the address nor a cookie names one. */
const DEFAULT_VARIANT: Variant = "4";
const DEFAULT_ONEPAGE: OnePageMode = "frame";

const isVariant = (value: string | undefined): value is Variant =>
	VARIANTS.some((variant) => variant.key === value);
const isOnePage = (value: string | undefined): value is OnePageMode =>
	ONEPAGE_MODES.some((mode) => mode.key === value);

/**
 * Whether a variant renders the current layout: variant 0 as it is, and variant 4, the Product
 * Owner's pick after the first round (2026-11-04), with the targeted fixes.
 */
export function usesCurrentLayout(variant: Variant): boolean {
	return variant === "0" || variant === "4";
}

export interface Design {
	variant: Variant;
	onepage: OnePageMode;
}

/** The design a request asks for: the address first, then the cookies, then the defaults. */
export function designOf(url: URL, cookie: (name: string) => string | undefined): Design {
	const variant = url.searchParams.get(VARIANT_PARAM) ?? cookie(VARIANT_COOKIE);
	const onepage = url.searchParams.get(ONEPAGE_PARAM) ?? cookie(ONEPAGE_COOKIE);
	return {
		variant: isVariant(variant ?? undefined) ? (variant as Variant) : DEFAULT_VARIANT,
		onepage: isOnePage(onepage ?? undefined) ? (onepage as OnePageMode) : DEFAULT_ONEPAGE,
	};
}

/** The design of the page Astro renders. */
export function pageDesign(astro: {
	url: URL;
	cookies: { get(name: string): { value: string } | undefined };
}): Design {
	return designOf(astro.url, (name) => astro.cookies.get(name)?.value);
}

/**
 * Thai words the browser's dictionary (ICU) splits in two, so a line can break inside them:
 * "เบา|หวาน", "ความ|ดัน|โลหิต", "ปฏิบัติ|งาน", "อำเภอ|สอง" (grill Q1 item 4; Node 26.13.0
 * Intl.Segmenter("th") gives the same splits). The prototype keeps each of them on one line. The
 * real fix is a spec question.
 */
const KEEP_TOGETHER = [
	"เบาหวาน",
	"ความดันโลหิตสูง",
	"ความดันโลหิต",
	"ปฏิบัติงาน",
	"อำเภอสอง",
	"จังหวัดแพร่",
	"สาธารณสุข",
	"ไข้เลือดออก",
	"ไข้หวัดใหญ่",
	"ผู้สูงอายุ",
	"ยุงลาย",
	"สมองเสื่อม",
	"หกล้ม",
	"อัมพาต",
	"คุณภาพชีวิต",
	"ประชาสัมพันธ์",
	"อาสาสมัคร",
	"ตรวจคัดกรอง",
	"คัดกรอง",
	"ประจำปี",
	"ประจำหมู่บ้าน",
	"หลังคาเรือน",
	"เครือข่าย",
];

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** The KEEP_TOGETHER words, the longest first, so "ความดันโลหิตสูง" wins over "ความดันโลหิต". */
const KEEP_TOGETHER_PATTERN = new RegExp(
	[...KEEP_TOGETHER].sort((a, b) => b.length - a.length).join("|"),
	"g",
);

/** `text` as HTML in which each KEEP_TOGETHER word cannot break across lines. */
export function thaiTitleHtml(text: string): string {
	let html = "";
	let at = 0;
	for (const match of text.matchAll(KEEP_TOGETHER_PATTERN)) {
		html += escapeHtml(text.slice(at, match.index));
		html += `<span class="whitespace-nowrap">${escapeHtml(match[0])}</span>`;
		at = match.index + match[0].length;
	}
	return html + escapeHtml(text.slice(at));
}

/** Whether an image field value is a portrait picture, such as a One Page. */
export function isPortrait(image: { width?: number; height?: number } | undefined): boolean {
	return !!image?.width && !!image.height && image.height > image.width;
}

/** A short Thai date with a two-digit year, "2 พ.ย. 69", for dense lists (variant 2). */
const SHORT_THAI_DATE = new Intl.DateTimeFormat("th-TH", {
	day: "numeric",
	month: "short",
	year: "2-digit",
	timeZone: "Asia/Bangkok",
});

export function shortThaiDate(value: Date | string | null | undefined): string {
	return value ? SHORT_THAI_DATE.format(new Date(value)) : "";
}

/** A date as the site writes it, "2 พ.ย. 2569", or nothing when it is not set. */
export function thaiDateOf(value: Date | string | null | undefined): string {
	return value ? formatThaiDate(value) : "";
}

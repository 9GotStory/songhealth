// PROTOTYPE (throwaway), Feature 011: Health Reports, Services, Health Services and /health, after
// the Homepage and Features 009 and 010's pages as built in main. One HTML file per case, each
// holding the variants switched by ?variant= and the floating bar:
//   /services          A "การ์ดหน้าแรก · ลิงก์ pill"   B "การ์ดหน้าแรก · ลิงก์ใต้ lead"
//                      C "แถว · ลิงก์ pill"           D "แถว · ลิงก์ใต้ lead"
//   /health-services   A "แถว"                        B "การ์ด"
//   /health/reports    A "แถว: tile ไอคอน"             B "แถว: tile วันที่"
//   /health            A "tile แบบหน้าแรก" (one look, grill Q12)
//   the three pages    A "บริการเป็นการ์ด / หน่วยบริการเป็นแถว"   B "บริการเป็นแถว / หน่วยบริการเป็นการ์ด"
// node .tmp/prototypes/health-reports-services-health-services/build.mjs  →  *.html, proto.css
//
// The grill (Product Owner, 2026-11-17, Q1–Q17) fixed everything else: each list's heading on the
// deep field as ListHeading.astro with the Homepage's labels and icons, the filter form over the
// field's edge, the header on the field with one card over its edge on the three pages and what
// each holds (Q9–Q11), "เปิดแผนที่" in a directory row (Q13), the catalog a plain 3/2/1 grid at any
// count (Q15). The markup copies the built components' classes (ListHeading, SectionHeading,
// HomeServiceCard, HomeQuickLink, FileTile, FileDownloadLink, DocumentDownloadRow, the Post
// page's header); the stylesheet is main's src/styles/global.css compiled by Tailwind over these
// pages. Content: data.json (extract.mjs), the demo dataset's; MADE_UP below marks the filler this
// prototype adds to fill a page, every title of it "[ตัวอย่าง]" too (grill Q14).
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const here = new URL("./", import.meta.url);
const D = JSON.parse(await readFile(new URL("data.json", here), "utf8"));
const SHELL = JSON.parse(await readFile(new URL("shell.json", here), "utf8"));
const O = "http://127.0.0.1:4324";
const esc = (s) =>
	String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const bkk = (value) => new Date(new Date(value).getTime() + 7 * 3600 * 1000);
const thaiDate = (value) => {
	const d = bkk(value);
	return `<time datetime="${esc(value)}">${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}</time>`;
};

const SERVICE_ICONS = {
	มือประคองหัวใจ: "hand-heart", ข้อความแจ้งเตือน: "message-square-warning", ตาชั่ง: "scale", หลอดไฟ: "lightbulb",
	เครื่องหมายคำถาม: "circle-question-mark", หัวใจและชีพจร: "heart-pulse", ใบไม้: "leaf", เม็ดยา: "pill", เอกสาร: "file-text",
	กลุ่มคน: "users", ลูกโลก: "globe", เข็มฉีดยา: "syringe", โล่: "shield-check", หูฟังแพทย์: "stethoscope", เด็กเล็ก: "baby",
	โทรศัพท์: "phone", แผ่นรายการ: "clipboard-list", โทรโข่ง: "megaphone",
};
const iconCache = new Map();
for (const name of new Set([
	...Object.values(SERVICE_ICONS),
	"hand-heart", "file-chart-column", "hospital", "users", "heart-pulse", "file-text", "folder-open", "download",
	"arrow-right", "arrow-up-right", "chevron-right", "chevron-left", "map-pin", "search",
])) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(name, node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""));
}
const icon = (name, size = 16, cls = "") =>
	`<svg class="shrink-0 ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconCache.get(name)}</svg>`;
let uid = 0;

// ---------------------------------------------------------------------------------------------
// Pieces that keep their look: breadcrumb, pager, filter form, empty state, details rows
// ---------------------------------------------------------------------------------------------
function breadcrumb(items, onField = false) {
	return `<nav aria-label="เส้นทางนำทาง"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-small ${onField ? "text-surface-base/75" : "text-text-secondary"}">${items
		.map(
			(item, index) =>
				`<li class="flex min-w-0 items-center gap-2">${index > 0 ? icon("chevron-right") : ""}${
					item.href
						? `<a class="underline underline-offset-4 ${onField ? "text-surface-base" : "text-brand-primary hover:text-brand-dark"}" href="${item.href}">${esc(item.label)}</a>`
						: `<span aria-current="page" class="wrap-anywhere max-sm:truncate ${onField ? "text-surface-base" : "text-text-primary"}">${esc(item.label)}</span>`
				}</li>`,
		)
		.join("")}</ol></nav>`;
}
const HOME = { label: "หน้าแรก", href: `${O}/` };
const HEALTH = { label: "ข้อมูลสุขภาพ", href: "health.html" };
const SERVICES = { label: "บริการประชาชน", href: "services-full.html" };

const pagerLink =
	"inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-input bg-surface-base px-5 text-label text-brand-primary hover:bg-surface-soft";
function pagination(hasMore) {
	if (!hasMore) return "";
	return `<nav aria-label="การแบ่งหน้า"><ul class="flex flex-wrap items-center justify-between gap-4 max-sm:grid max-sm:grid-cols-[auto_auto]">
<li class="max-sm:col-start-1 max-sm:row-start-2"></li>
<li class="text-label text-text-secondary max-sm:col-span-2 max-sm:row-start-1 max-sm:text-center">หน้า 1</li>
<li class="max-sm:col-start-2 max-sm:row-start-2"><a class="${pagerLink}" rel="next" href="#next">หน้าถัดไป${icon("chevron-right")}</a></li>
</ul></nav>`;
}
const control = "min-h-11 w-full min-w-0 rounded-14 border border-border-input bg-surface-base px-3 text-body";
/** FilterForm.astro: a select per field, or a text field, then the actions. */
function filterForm(label, fields, clearHref) {
	const set = fields.some((f) => f.value);
	return `<form method="get" aria-label="${label}" class="flex flex-col gap-4 rounded-24 bg-surface-base p-5 text-text-primary shadow-card sm:flex-row sm:flex-wrap sm:items-end">${fields
		.map((f) =>
			f.text
				? `<div class="flex min-w-0 flex-col gap-1.5 sm:w-72"><label class="text-label" for="filter-${f.name}">${f.label}</label><input id="filter-${f.name}" name="${f.name}" type="search" value="${esc(f.value)}" class="${control}"></div>`
				: `<div class="flex min-w-0 flex-col gap-1.5 sm:w-72"><label class="text-label" for="filter-${f.name}">${f.label}</label>
<select id="filter-${f.name}" name="${f.name}" class="${control}"><option value="">${f.any}</option>${f.options.map((o) => `<option${o === f.value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`,
		)
		.join("")}
<div class="flex flex-wrap items-center gap-4"><button type="button" class="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-brand-primary px-6 text-label text-surface-base hover:bg-brand-dark">แสดงผล</button>${
		set ? `<a class="inline-flex min-h-11 items-center rounded-pill border border-border-input bg-surface-soft px-6 text-label text-brand-primary hover:bg-surface-base" href="${clearHref}">ล้างตัวกรอง</a>` : ""
	}</div></form>`;
}
const detailRows = (rows) =>
	rows
		.filter(([, value]) => value)
		.map(
			([term, value]) =>
				`<div class="flex flex-col gap-1 sm:flex-row sm:gap-6"><dt class="text-label text-text-secondary sm:w-44 sm:shrink-0">${term}</dt><dd class="wrap-anywhere">${value}</dd></div>`,
		)
		.join("");
const attentionLabel = (text) => `<span class="inline-flex rounded-pill bg-accent-warm px-3 text-label text-brand-dark">${esc(text)}</span>`;
const plainLabel = (text) => `<span class="inline-flex rounded-pill bg-surface-soft px-3 text-label text-brand-dark">${esc(text)}</span>`;

// ---------------------------------------------------------------------------------------------
// The field and the headings (DeepField, SectionHeading, ListHeading)
// ---------------------------------------------------------------------------------------------
const deepField = (inner, ring = true) =>
	`<div data-testid="deep-field" class="deep-field focus-ring-on-dark relative overflow-x-clip rounded-b-24 text-surface-base sm:rounded-b-32 sm:[--deep-field-glow:28%_12rem_at_100%_0%]"><div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-clip rounded-b-[inherit]">${
		ring ? '<span class="absolute rounded-pill top-15 -right-42.5 size-130 border-[1.5px] border-surface-base/18 max-lg:hidden"></span>' : ""
	}</div>${inner}</div>`;
function sectionHeading({ iconName, label, title, onField, tag = "h2", id }) {
	return `<div class="flex min-w-0 items-center gap-3.5 sm:gap-5"><span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 sm:size-18 sm:rounded-22 ${
		onField ? "bg-accent-warm text-brand-dark" : "bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile"
	}">${icon(iconName, 24)}</span><div class="min-w-0"><p class="mb-1.5 text-label font-semibold tracking-[0.02em] before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/'] ${
		onField ? "text-surface-base" : "text-brand-primary"
	}">${label}</p><${tag}${id ? ` id="${id}"` : ""} class="section-title wrap-anywhere ${onField ? "text-surface-base" : "text-text-primary"}">${esc(title)}</${tag}></div></div>`;
}
const pillLink = (link) =>
	`<a href="${link.href}" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-pill border-[1.5px] border-surface-base bg-surface-base px-5 text-body font-semibold text-brand-primary hover:border-accent-warm hover:bg-accent-warm hover:text-brand-dark motion-safe:transition-colors sm:h-13 sm:px-7">${esc(link.label)}${icon("arrow-right")}</a>`;
/**
 * ListHeading.astro and the list's body over the field's edge. `links` sit at the heading's upper
 * right from 640 px as pills ("pills"), or under the lead as white underlined links ("lead").
 */
function listPage({ crumbs, iconName, label, title, lead, links = [], linksAs = "pills" }, body) {
	const leadLinks = links.length && linksAs === "lead"
		? `<ul class="flex flex-wrap gap-x-6 gap-y-1">${links.map((l) => `<li><a class="inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-surface-base underline underline-offset-4 hover:text-accent-warm" href="${l.href}">${esc(l.label)}${icon("arrow-right")}</a></li>`).join("")}</ul>`
		: "";
	const pills = links.length && linksAs === "pills"
		? `<div class="flex shrink-0 flex-col items-start gap-3 sm:items-end">${links.map(pillLink).join("")}</div>`
		: "";
	return (
		deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 pb-24 sm:gap-8 sm:pb-32">${breadcrumb(crumbs, true)}
<div class="flex flex-col gap-5 sm:flex-row sm:justify-between sm:gap-6"><div class="flex min-w-0 flex-col gap-4">${sectionHeading({ iconName, label, title, onField: true, tag: "h1" })}
<p class="max-w-prose text-body-large">${lead}</p>${leadLinks}</div>${pills}</div></div>`) +
		`<div class="page-container relative -mt-16 flex flex-col gap-8 pb-16 sm:-mt-22 lg:pb-20">${body}</div>`
	);
}
const roundArrow = `<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-soft text-brand-primary group-hover:bg-accent-warm group-hover:text-brand-dark motion-safe:transition-colors max-sm:hidden">${icon("arrow-right", 20)}</span>`;

// ---------------------------------------------------------------------------------------------
// Services: A/B the Homepage's card (HomeServiceCard), C/D a row
// ---------------------------------------------------------------------------------------------
const serviceIcon = (s) => icon(SERVICE_ICONS[s.icon] ?? "hand-heart", 24);
const serviceHref = (s) => (s.slug === "demo-service-flu-vaccine" ? "page-service-flu.html" : s.slug === "demo-service-health-rights" ? "page-service-external.html" : "page-service-complaint.html");
/** HomeServiceCard.astro, its name an H2 on the catalog (H3 under a section heading). */
function serviceCard(s, tag = "h2", shadow = "shadow-card group-hover:shadow-deep") {
	const id = `c${++uid}`;
	return `<article class="group focus-ring-on-light h-full"><div class="relative flex h-full items-center gap-4 rounded-22 bg-surface-base p-4 text-text-primary ${shadow} group-hover:bg-brand-primary group-hover:text-surface-base motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:-translate-y-2 sm:min-h-36 sm:items-start sm:p-6">
<span aria-hidden="true" class="absolute inset-0 overflow-hidden rounded-22"><span class="absolute -right-10 -bottom-10 size-30 rounded-pill bg-surface-soft group-hover:bg-brand-primary motion-safe:transition-transform motion-safe:duration-400 motion-safe:group-hover:scale-600"></span></span>
<span aria-hidden="true" class="relative flex size-12 shrink-0 items-center justify-center rounded-14 bg-surface-soft text-brand-primary group-hover:bg-accent-warm group-hover:text-brand-dark motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-106 motion-safe:group-hover:-rotate-8 sm:size-14 sm:rounded-18">${serviceIcon(s)}</span>
<div class="relative min-w-0 flex-1"><${tag} id="${id}" class="text-body-large font-semibold wrap-anywhere">${esc(s.title)}</${tag}>${
		s.summary ? `<p class="mt-1 line-clamp-3 text-label font-normal text-text-secondary-on-soft group-hover:text-surface-base max-sm:hidden">${esc(s.summary)}</p>` : ""
	}</div>
${icon("arrow-right", 20, "relative text-brand-primary group-hover:text-surface-base")}
<a href="${serviceHref(s)}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></div></article>`;
}
/** A row: the icon's tile, the category, the name and the summary, the round arrow; one link. */
function serviceRow(s, tag = "h2") {
	const id = `c${++uid}`;
	return `<article class="group"><div class="relative flex items-center gap-3.5 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-2.5 motion-safe:group-hover:shadow-deep sm:gap-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5">
<span aria-hidden="true" class="flex size-14 shrink-0 items-center justify-center rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-accent-warm sm:size-18 sm:rounded-18">${serviceIcon(s)}</span>
<div class="min-w-0 flex-1">${s.category ? `<p class="mb-1 text-small text-text-secondary">${esc(s.category)}</p>` : ""}<${tag} id="${id}" class="line-clamp-2 text-body font-semibold wrap-anywhere sm:text-body-large">${esc(s.title)}</${tag}>${
		s.summary ? `<p class="mt-1 line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(s.summary)}</p>` : ""
	}</div>${roundArrow}
<a href="${serviceHref(s)}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></div></article>`;
}
const serviceList = (items, asCards, tag = "h2") =>
	asCards
		? `<ul class="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">${items.map((s) => `<li class="scroll-reveal min-w-0">${serviceCard(s, tag)}</li>`).join("")}</ul>`
		: `<ul class="flex flex-col gap-3.5">${items.map((s) => `<li class="scroll-reveal">${serviceRow(s, tag)}</li>`).join("")}</ul>`;

// MADE_UP: three Services to fill the catalog's first page of twelve, and one category of one.
const fillerServices = [
	{ slug: "x1", title: "[ตัวอย่าง] ขอรับคำปรึกษาเรื่องการเลิกบุหรี่และเครื่องดื่มแอลกอฮอล์สำหรับผู้ที่ต้องการเลิกอย่างจริงจังพร้อมการติดตามผลต่อเนื่อง", icon: "หูฟังแพทย์", summary: "ชื่อยาวที่สุดของชุดนี้ เพื่อดูการตัดบรรทัดของชื่อบริการในการ์ดและในแถว", category: "ขอข้อมูลและบริการอื่น" },
	{ slug: "x2", title: "[ตัวอย่าง] แจ้งเหตุสัตว์กัด", icon: "โทรโข่ง", summary: null, category: "แจ้งปัญหาสุขภาพ" },
	{ slug: "x3", title: "[ตัวอย่าง] ตรวจคัดกรองโรคเรื้อรัง", icon: "หัวใจและชีพจร", summary: "ตรวจคัดกรองเบาหวานและความดันโลหิตสูงที่หน่วยบริการสุขภาพที่เกี่ยวข้อง", category: "ขอข้อมูลและบริการอื่น" },
];
const allServices = [...D.services, ...fillerServices].sort((a, b) => a.title.localeCompare(b.title, "th"));
const byCategory = (label) => allServices.filter((s) => s.category === label).slice(0, 12);
const SERVICE_CATEGORIES = ["ร้องเรียนและเสนอแนะ", "แจ้งปัญหาสุขภาพ", "ขอข้อมูลและบริการอื่น"];
const SERVICES_HEADING = {
	crumbs: [HOME, { label: "บริการประชาชน" }],
	iconName: "users",
	label: "บริการ",
	title: "บริการประชาชน",
	lead: "บริการที่สำนักงานสาธารณสุขอำเภอสองให้บริการเอง ประสานให้ หรือแนะนำช่องทาง พร้อมผู้ให้บริการ ช่องทาง ขั้นตอน และเอกสารที่ต้องเตรียมก่อนไปรับบริการ",
	links: [
		{ href: "directory-full.html", label: "ค้นหาหน่วยบริการสุขภาพที่เกี่ยวข้อง" },
		{ href: `${O}/documents`, label: "คู่มือและแบบฟอร์ม" },
	],
};
const servicesCases = {
	"services-full": ["บริการ: หน้าแรกเต็ม 12 รายการ (มีหน้าถัดไป)", allServices.slice(0, 12), "", true],
	"services-four": ["บริการ: กรองหมวด 4 รายการ", byCategory("ขอข้อมูลและบริการอื่น").slice(0, 4), "ขอข้อมูลและบริการอื่น", false],
	"services-two": ["บริการ: กรองหมวด 2 รายการ", byCategory("ร้องเรียนและเสนอแนะ"), "ร้องเรียนและเสนอแนะ", false],
	"services-one": ["บริการ: 1 รายการ (หมวดสมมุติ)", [allServices.find((s) => s.slug === "demo-service-health-rights")], "บริการออนไลน์ (สมมุติ)", false],
};
const SERVICE_VARIANTS = { A: [true, "pills"], B: [true, "lead"], C: [false, "pills"], D: [false, "lead"] };

// ---------------------------------------------------------------------------------------------
// The Health Service Directory: A a row, B a card; each with "เปิดแผนที่" when it has coordinates
// ---------------------------------------------------------------------------------------------
const STATUS = { active: "เปิดให้บริการ", temporarily_closed: "ปิดให้บริการชั่วคราว", inactive: "ไม่เปิดให้บริการแล้ว" };
const outOfService = (h) => h.status === "temporarily_closed" || h.status === "inactive";
const shown = (h) => h.displayName || h.title;
const mapHref = (h) => (h.latitude != null && h.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}` : null);
/** MapLink.astro's pill, its name with the Health Service's (grill Q13). */
const mapPill = (h, cls = "") =>
	mapHref(h)
		? `<a class="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-border-input bg-surface-base px-5 text-label font-semibold text-brand-primary hover:bg-surface-soft ${cls}" href="${mapHref(h)}" target="_blank" rel="noopener">${icon("map-pin", 20)}เปิดแผนที่<span class="sr-only"> ${esc(shown(h))} (เปิดในแท็บใหม่)</span>${icon("arrow-up-right")}</a>`
		: "";
const healthServiceHref = (h) => (outOfService(h) ? "page-health-service-closed.html" : "page-health-service-full.html");
const hsTile = (cls) => `<span aria-hidden="true" class="flex shrink-0 items-center justify-center bg-linear-140 from-brand-primary to-brand-dark text-accent-warm ${cls}">${icon("hospital", 24)}</span>`;
const hsFacts = (h) => [h.type, h.areas.join(", ")].filter(Boolean).map(esc).join('<span aria-hidden="true" class="mx-1.5">·</span>');
function healthServiceRow(h, tag = "h2") {
	const place = "max-sm:col-span-2 sm:col-start-2 sm:justify-self-start lg:col-start-3 lg:row-start-1";
	return `<article class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-deep sm:gap-x-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
${hsTile("size-17 rounded-14 sm:size-23 sm:rounded-18")}
<div class="flex min-w-0 flex-col gap-1"><p class="text-small text-text-secondary">${hsFacts(h)}</p>${outOfService(h) ? `<p class="flex pb-0.5">${attentionLabel(STATUS[h.status])}</p>` : ""}
<${tag} class="text-body font-semibold wrap-anywhere sm:text-body-large"><a class="line-clamp-2 w-fit underline-offset-4 hover:text-brand-primary hover:underline" href="${healthServiceHref(h)}">${esc(shown(h))}</a></${tag}>${
		h.displayName ? `<p class="text-small wrap-anywhere text-text-secondary">${esc(h.title)}</p>` : ""
	}${h.address ? `<p class="line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(h.address)}</p>` : ""}</div>
${mapPill(h, place)}</article>`;
}
function healthServiceCard(h, tag = "h2") {
	return `<article class="flex h-full flex-col gap-3 rounded-22 bg-surface-base p-5 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-deep">
<div class="flex items-center gap-3">${hsTile("size-13 rounded-16")}<div class="flex min-w-0 flex-wrap gap-2"><span class="rounded-pill bg-surface-soft px-3 py-0.5 text-small font-semibold wrap-anywhere text-brand-primary">${esc(h.type)}</span>${outOfService(h) ? attentionLabel(STATUS[h.status]) : ""}</div></div>
<${tag} class="text-body-large font-semibold wrap-anywhere"><a class="line-clamp-3 underline-offset-4 hover:text-brand-primary hover:underline" href="${healthServiceHref(h)}">${esc(shown(h))}</a></${tag}>${
		h.displayName ? `<p class="-mt-2 text-small wrap-anywhere text-text-secondary">${esc(h.title)}</p>` : ""
	}<p class="text-small text-text-secondary">${esc(h.areas.join(", "))}</p><p class="flex gap-1.5 text-small text-text-secondary">${icon("map-pin", 16, "mt-0.5")}<span class="line-clamp-3 wrap-anywhere">${esc(h.address ?? "")}</span></p>
<div class="mt-auto pt-1">${mapPill(h, "w-full")}</div></article>`;
}
const healthServiceList = (items, asRows, tag = "h2") =>
	asRows
		? `<ul class="flex flex-col gap-3.5">${items.map((h) => `<li class="scroll-reveal">${healthServiceRow(h, tag)}</li>`).join("")}</ul>`
		: `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">${items.map((h) => `<li class="scroll-reveal min-w-0">${healthServiceCard(h, tag)}</li>`).join("")}</ul>`;

// MADE_UP: sixteen Health Services to fill the directory's first page of twenty: invented names,
// "ตัวอย่างที่ N", never a real facility; every fourth without coordinates, one inactive.
const AREAS = ["ตำบลบ้านกลาง", "ตำบลสะเอียบ", "ตำบลห้วยหม้าย"];
const fillerHealthServices = Array.from({ length: 16 }, (_, i) => ({
	slug: `x-hs-${i + 5}`,
	title: `[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลตัวอย่างที่ ${i + 5}`,
	displayName: `[ตัวอย่าง] รพ.สต.ตัวอย่างที่ ${i + 5}`,
	type: "โรงพยาบาลส่งเสริมสุขภาพตำบล",
	areas: [AREAS[i % 3]],
	status: i === 6 ? "inactive" : "active",
	address: `${i + 10} หมู่ ${(i % 9) + 1} ${AREAS[i % 3]} อำเภอสอง จังหวัดแพร่ 54120`,
	latitude: i % 4 === 3 ? null : 18.45 + i / 100,
	longitude: i % 4 === 3 ? null : 100.18 + i / 100,
}));
const allHealthServices = [...D.healthServices, ...fillerHealthServices].sort((a, b) => shown(a).localeCompare(shown(b), "th"));
const DIRECTORY_HEADING = {
	crumbs: [HOME, SERVICES, { label: "หน่วยบริการสุขภาพที่เกี่ยวข้อง" }],
	iconName: "hospital",
	label: "หน่วยบริการ",
	title: "หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	lead: "ค้นหาโรงพยาบาล รพ.สต. และหน่วยบริการสุขภาพอื่นที่เกี่ยวข้องกับอำเภอสอง ตามพื้นที่รับผิดชอบหรือชื่อ พร้อมที่อยู่ เวลาทำการ ช่องทางติดต่อ และลิงก์เปิดแผนที่",
};
const demoHs = D.healthServices;
const directoryCases = {
	"directory-full": ["หน่วยบริการ: หน้าแรกเต็ม 20 แห่ง (มีหน้าถัดไป)", allHealthServices.slice(0, 20), {}, true],
	"directory-demo": ["หน่วยบริการ: 4 แห่งของ demo (มีปิดชั่วคราว)", [...demoHs].sort((a, b) => shown(a).localeCompare(shown(b), "th")), {}, false],
	"directory-two": ["หน่วยบริการ: กรองพื้นที่ 2 แห่ง", demoHs.filter((h) => h.areas.includes("ตำบลบ้านกลาง")), { area: "ตำบลบ้านกลาง" }, false],
	"directory-one": ["หน่วยบริการ: ค้นชื่อ 1 แห่ง", demoHs.filter((h) => shown(h).includes("สะเอียบ")), { name: "สะเอียบ" }, false],
};

// ---------------------------------------------------------------------------------------------
// Health Reports: A the icon's tile (Document row), B the date's tile (Announcement row)
// ---------------------------------------------------------------------------------------------
const reportDate = (r) => r.reportAt ?? r.published;
const reportHref = (r) => (r.slug === "demo-report-performance-2569" ? "page-report-no-date.html" : r.slug === "x-unavailable" ? "page-report-unavailable.html" : "page-report-full.html");
const dot = '<span aria-hidden="true" class="mx-1.5">·</span>';
function reportRow(r, variant) {
	const id = `c${++uid}`;
	const facts = [variant === "A" && r.type && esc(r.type), variant === "A" && thaiDate(reportDate(r)), r.fiscalYear && `ปีงบประมาณ ${r.fiscalYear}`].filter(Boolean).join(dot);
	const d = bkk(reportDate(r));
	const tile =
		variant === "A"
			? `<p aria-hidden="true" class="flex size-17 shrink-0 flex-col items-center justify-center gap-1 rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-surface-base sm:size-23 sm:rounded-18">${icon("file-chart-column", 24)}${r.fiscalYear ? `<span class="text-small font-semibold text-accent-warm">${r.fiscalYear}</span>` : ""}</p>`
			: `<p class="flex size-17 shrink-0 flex-col items-center justify-center rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-surface-base sm:size-23 sm:rounded-18"><time datetime="${reportDate(r)}" class="flex flex-col items-center"><span class="text-h3/7 font-bold sm:text-h2/9.5">${d.getUTCDate()}</span> <span class="text-small text-accent-warm">${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}</span></time></p>`;
	const badge = variant === "B" && r.type ? `<p class="mb-1.5 flex"><span class="rounded-pill bg-surface-soft px-3 py-0.5 text-small font-semibold wrap-anywhere text-brand-primary">${esc(r.type)}</span></p>` : "";
	return `<article class="group"><div class="relative flex items-center gap-3.5 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-2.5 motion-safe:group-hover:shadow-deep sm:gap-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5">
${tile}<div class="min-w-0 flex-1">${badge}${facts ? `<p class="mb-1 text-small text-text-secondary">${facts}</p>` : ""}<h2 id="${id}" class="line-clamp-2 text-body font-semibold wrap-anywhere group-hover:text-brand-primary sm:text-body-large">${esc(r.title)}</h2>${
		r.summary ? `<p class="mt-1 line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(r.summary)}</p>` : ""
	}${r.period ? `<p class="mt-1 text-small wrap-anywhere text-text-secondary">ช่วงเวลาของรายงาน: ${esc(r.period)}</p>` : ""}</div>${roundArrow}
<a href="${reportHref(r)}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></div></article>`;
}
// MADE_UP: seventeen reports to fill the first page of twenty, each "[ตัวอย่าง]", monthly
// situation reports of invented diseases' names and dates; one without a fiscal year.
const TOPICS = ["โรคไข้เลือดออก", "โรคมือ เท้า ปาก", "โรคไข้หวัดใหญ่", "โรคอุจจาระร่วง", "โรคปอดอักเสบ"];
const fillerReports = Array.from({ length: 17 }, (_, i) => {
	const at = new Date(Date.UTC(2026, 9 - Math.floor(i / 2), 28 - (i % 2) * 14, 2));
	const month = bkk(at);
	return {
		slug: `x-report-${i}`,
		title: `[ตัวอย่าง] รายงานสถานการณ์${TOPICS[i % 5]} อำเภอสอง ${["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"][month.getUTCMonth()]} ${month.getUTCFullYear() + 543}`,
		summary: i % 3 === 0 ? null : "จำนวนผู้ป่วยและการดำเนินงานควบคุมโรครายตำบล",
		type: "รายงานสถานการณ์โรค",
		reportAt: at.toISOString(),
		period: i % 4 === 0 ? null : "รายเดือน",
		fiscalYear: i === 5 ? null : 2569,
	};
});
const allReports = [...D.healthReports, ...fillerReports].sort((a, b) => new Date(reportDate(b)) - new Date(reportDate(a)));
const REPORTS_HEADING = {
	crumbs: [HOME, HEALTH, { label: "รายงานสุขภาพ" }],
	iconName: "file-chart-column",
	label: "สุขภาพ",
	title: "รายงานสุขภาพ",
	lead: "รายงานด้านสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย พร้อมเอกสารรายงานฉบับเต็ม",
};
const sortedDemoReports = [...D.healthReports].sort((a, b) => new Date(reportDate(b)) - new Date(reportDate(a)));
const reportCases = {
	"reports-full": ["รายงาน: หน้าแรกเต็ม 20 ฉบับ (มีหน้าถัดไป)", allReports.slice(0, 20), true],
	"reports-demo": ["รายงาน: 3 ฉบับของ demo (1 ฉบับไม่มีวันที่รายงาน)", sortedDemoReports, false],
	"reports-two": ["รายงาน: 2 ฉบับ", sortedDemoReports.slice(0, 2), false],
	"reports-one": ["รายงาน: 1 ฉบับ", sortedDemoReports.slice(0, 1), false],
};

// ---------------------------------------------------------------------------------------------
// The three pages: the Post page's header on the field and one card over its edge (§9.4, §9.5)
// ---------------------------------------------------------------------------------------------
const pillsRow = (parts) => (parts.length ? `<p class="flex flex-wrap items-center gap-2 text-small font-semibold">${parts.join("")}</p>` : "");
const warmPill = (html) => `<span class="rounded-pill border border-transparent bg-accent-warm px-3 py-0.5 text-brand-dark">${html}</span>`;
const outlinePill = (text) => `<span class="rounded-pill border border-surface-base/40 px-3 py-0.5 wrap-anywhere">${esc(text)}</span>`;
function itemPage({ crumbs, pillParts, title, under, card, rest }) {
	const head = `<div class="page-container relative pt-6 ${card ? "pb-20 sm:pb-24" : "pb-10 sm:pb-12"}"><header class="flex max-w-3xl flex-col gap-6">${breadcrumb(crumbs, true)}
<div class="hero-enter flex flex-col gap-3">${pillsRow(pillParts)}<h1 class="text-h3 wrap-anywhere sm:text-h2 lg:text-h1">${esc(title)}</h1>${
		under ? `<p class="text-body-large whitespace-pre-line">${esc(under)}</p>` : ""
	}</div></header></div>`;
	return `<article class="pb-16 lg:pb-20">${deepField(head, false)}${
		card ? `<div class="page-container relative -mt-12 sm:-mt-14"><div class="flex max-w-3xl flex-col gap-5 rounded-24 bg-surface-base p-5 text-text-primary shadow-deep">${card}</div></div>` : ""
	}${rest ? `<div class="page-container flex flex-col gap-8 pt-8 lg:pt-10"><div class="flex max-w-3xl flex-col gap-8">${rest}</div></div>` : ""}</article>`;
}
const fileTile = (file) =>
	`<p aria-hidden="true" class="flex size-17 shrink-0 flex-col items-center justify-center gap-1 rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-surface-base sm:size-23 sm:rounded-18">${icon("file-text", 24)}<span class="text-small font-semibold text-accent-warm">${esc(file?.kind ?? "ไฟล์")}</span></p>`;
const downloadLink = (file, words, context, cls = "") =>
	`<a class="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-brand-primary px-5 py-2 text-center text-label font-semibold text-surface-base hover:bg-brand-dark motion-safe:transition-colors ${cls}" href="#download">${icon("download", 20)}<span>${words} <span class="font-normal whitespace-nowrap">(${esc(file.kind)}, ${esc(file.size)})</span></span>${context ? `<span class="sr-only"> ${esc(context)}</span>` : ""}</a>`;
const unavailableNotice = (message) =>
	`<div class="flex flex-col items-start gap-2 rounded-24 bg-surface-soft p-5"><p class="font-semibold text-brand-dark">${message}</p><p class="text-text-secondary-on-soft">หากต้องการเอกสารนี้ โปรดติดต่อสำนักงาน</p><a class="text-label text-brand-primary underline underline-offset-4" href="${O}/contact">ติดต่อเรา</a></div>`;
const detailSection = (id, heading, html) =>
	`<section aria-labelledby="${id}" class="flex max-w-3xl flex-col gap-3"><h2 id="${id}" class="text-h3 text-brand-dark">${esc(heading)}</h2>${html}</section>`;
const paragraphs = (list) => `<div class="rich-text">${list.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
const linkClass = "inline-flex min-h-11 items-center gap-1 text-brand-primary underline underline-offset-4";

/** DocumentDownloadRow.astro under "เอกสารที่เกี่ยวข้อง" (Feature 010), its title an H3. */
function documentRow(doc) {
	const place = "max-sm:col-span-2 sm:col-start-2 lg:col-start-3 lg:row-start-1";
	return `<article class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-deep sm:gap-x-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">${fileTile(doc.file)}
<div class="flex min-w-0 flex-col gap-1"><p class="text-small text-text-secondary">${[doc.type && esc(doc.type), doc.date && thaiDate(doc.date), doc.fiscalYear && `ปีงบประมาณ ${doc.fiscalYear}`].filter(Boolean).join(dot)}</p>
<h3 class="text-body font-semibold wrap-anywhere sm:text-body-large"><a class="line-clamp-2 w-fit underline-offset-4 hover:text-brand-primary hover:underline" href="${O}/documents/${doc.slug}">${esc(doc.title)}</a></h3>${
		doc.summary ? `<p class="line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(doc.summary)}</p>` : ""
	}</div>${downloadLink(doc.file, "ดาวน์โหลด", doc.title, `sm:justify-self-start ${place}`)}</article>`;
}
const homeSection = (id, iconName, label, title, html) =>
	`<section aria-labelledby="${id}" class="flex flex-col gap-6 sm:gap-7">${sectionHeading({ iconName, label, title, id })}${html}</section>`;

// A Health Report's page (grill Q9).
function reportPage(r, { unavailable = false } = {}) {
	const doc = unavailable ? null : D.documents[r.document];
	const fileBlock = doc
		? `<div class="flex flex-wrap items-center gap-4">${fileTile(doc.file)}<div class="min-w-0 flex-1"><h2 class="text-body-large font-semibold text-brand-dark">เอกสารรายงาน</h2><p><a class="font-semibold wrap-anywhere text-brand-primary underline underline-offset-4" href="${O}/documents/${doc.slug}">${esc(doc.title)}</a></p><p class="text-small text-text-secondary">${esc(doc.file.kind)}, ${esc(doc.file.size)}</p></div>${downloadLink(doc.file, "ดาวน์โหลดเอกสาร", null, "sm:h-13 sm:px-7 max-sm:w-full")}</div>`
		: `<div class="flex flex-col gap-3"><h2 class="text-body-large font-semibold text-brand-dark">เอกสารรายงาน</h2>${unavailableNotice("เอกสารรายงานไม่พร้อมให้บริการ")}</div>`;
	const rows = [
		["ประเภทรายงาน", esc(r.type)],
		["วันที่รายงาน", r.reportAt && thaiDate(r.reportAt)],
		["ช่วงเวลาของรายงาน", esc(r.period)],
		["ปีงบประมาณ", r.fiscalYear],
		["เจ้าของ/แหล่งที่มา", esc(r.owner)],
	];
	return itemPage({
		crumbs: [HOME, HEALTH, { label: "รายงานสุขภาพ", href: "reports-full.html" }, { label: r.title }],
		pillParts: [r.reportAt && warmPill(`วันที่รายงาน ${thaiDate(r.reportAt)}`), r.type && outlinePill(r.type)].filter(Boolean),
		title: r.title,
		under: r.summary,
		card: `${fileBlock}<hr class="border-border-default"><dl class="flex flex-col gap-3">${detailRows(rows)}</dl>`,
	});
}

const OWNERSHIP = {
	direct: "สำนักงานสาธารณสุขอำเภอสองให้บริการเอง",
	coordinated: "สำนักงานสาธารณสุขอำเภอสองรับเรื่องและประสานให้ โดยมีหน่วยงานอื่นร่วมดำเนินการ",
	related_health_service: "หน่วยบริการสุขภาพที่เกี่ยวข้อง เช่น โรงพยาบาลหรือ รพ.สต. เป็นผู้ให้บริการ",
	external_digital: "หน่วยงานภายนอกให้บริการทางออนไลน์ เว็บไซต์นี้แนะนำช่องทางเข้าถึงเท่านั้น",
};
// A Service's page (grill Q10): its offering Health Services in the directory's look of the variant.
function servicePage(s, variant) {
	const rows = [
		["ผู้ให้บริการ", s.ownership && OWNERSHIP[s.ownership]],
		["หน่วยงานผู้ให้บริการ", esc(s.provider)],
		["หมวดบริการ", s.category && `<a class="${linkClass}" href="services-four.html">${esc(s.category)}</a>`],
	];
	const external = s.externalUrl
		? `<div class="flex flex-col items-start gap-2"><a href="${s.externalUrl}" class="inline-flex min-h-11 flex-wrap items-center gap-x-2 rounded-pill bg-brand-primary px-6 py-2 text-label text-surface-base hover:bg-brand-dark">ไปยังเว็บไซต์ของบริการ${icon("arrow-up-right")}</a><p class="text-small wrap-anywhere text-text-secondary">ลิงก์นี้พาออกจากเว็บไซต์ของสำนักงานไปยัง ${esc(new URL(s.externalUrl).host)}</p></div>`
		: "";
	const sections = [
		s.channels.length && detailSection("service-channels", "ช่องทางรับบริการ", `<ul class="flex list-disc flex-col gap-1 pl-6">${s.channels.map((c) => `<li class="wrap-anywhere">${c.url ? `<a class="${linkClass}" href="${c.url}">${esc(c.label)}</a>` : esc(c.label)}</li>`).join("")}</ul>`),
		s.eligibility.length && detailSection("service-eligibility", "คุณสมบัติและเงื่อนไข", paragraphs(s.eligibility)),
		s.steps.length && detailSection("service-steps", "ขั้นตอนการรับบริการ", paragraphs(s.steps)),
		s.requiredDocuments.length && detailSection("service-required-documents", "เอกสารที่ต้องเตรียม", paragraphs(s.requiredDocuments)),
		s.contact.length && detailSection("service-contact", "สถานที่และช่องทางติดต่อ", paragraphs(s.contact)),
		s.duration && detailSection("service-duration", "ระยะเวลาดำเนินการ", `<p>${esc(s.duration)}</p>`),
		s.fees && detailSection("service-fees", "ค่าธรรมเนียม", `<p>${esc(s.fees)}</p>`),
		s.notes && detailSection("service-notes", "หมายเหตุ", `<p>${esc(s.notes)}</p>`),
	].filter(Boolean);
	const docs = s.documents.map((slug) => D.documents[slug]).filter(Boolean);
	const offering = D.healthServices.filter((h) => h.offers.includes(s.slug));
	const tail = [
		docs.length && homeSection("related", "folder-open", "เอกสารเผยแพร่", "เอกสารที่เกี่ยวข้อง", `<ul class="flex flex-col gap-3.5">${docs.map((d) => `<li>${documentRow(d)}</li>`).join("")}</ul>`),
		offering.length && homeSection("service-health-services", "hospital", "หน่วยบริการ", "หน่วยบริการสุขภาพที่ให้บริการนี้", healthServiceList(offering, variant === "A", "h3").replace("lg:grid-cols-3", "")),
	].filter(Boolean);
	return itemPage({
		crumbs: [HOME, SERVICES, { label: s.title }],
		pillParts: s.category ? [outlinePill(s.category)] : [],
		title: s.title,
		under: s.summary,
		card: `<dl class="flex flex-col gap-3">${detailRows(rows)}</dl>${external}`,
		rest: [...sections, ...tail].join(""),
	});
}

// A Health Service's page (grill Q11): the Services it offers in the catalog's look of the variant.
function healthServicePage(h, variant) {
	const location = [
		["ที่ตั้ง", (h.address || mapHref(h)) && `<div class="flex flex-col items-start gap-3">${h.address ? `<p class="whitespace-pre-line">${esc(h.address)}</p>` : ""}${mapPill(h)}</div>`],
		["เวลาทำการ", h.hours && `<p class="whitespace-pre-line">${esc(h.hours)}</p>`],
		["ช่องทางติดต่อ", h.contact && `<p class="whitespace-pre-line">${esc(h.contact)}</p>`],
	];
	const details = [
		["รหัสหน่วยบริการ", esc(h.code)],
		["ประเภทหน่วยบริการ", esc(h.type)],
		["สังกัด", esc(h.affiliation)],
		["สถานะการให้บริการ", h.status && (outOfService(h) ? attentionLabel(STATUS[h.status]) : plainLabel(STATUS[h.status]))],
		["พื้นที่รับผิดชอบ", h.areas.length && h.areas.map((a) => `<a class="${linkClass}" href="directory-two.html">${esc(a)}</a>`).join(", ")],
	];
	const offered = allServices.filter((s) => h.offers.includes(s.slug));
	// MADE_UP: the hospital offers two more of the demo's Services here, so the section holds three.
	const services = h.slug === "demo-health-service-song-hospital" ? [...offered, ...allServices.filter((s) => ["demo-service-health-problem", "demo-service-complaint"].includes(s.slug))] : offered;
	const hasLocation = location.some(([, v]) => v);
	return itemPage({
		crumbs: [HOME, SERVICES, { label: "หน่วยบริการสุขภาพที่เกี่ยวข้อง", href: "directory-full.html" }, { label: shown(h) }],
		pillParts: [h.type && outlinePill(h.type), outOfService(h) && warmPill(STATUS[h.status])].filter(Boolean),
		title: shown(h),
		under: h.displayName ? h.title : null,
		card: `${hasLocation ? `<dl class="flex flex-col gap-3">${detailRows(location)}</dl><hr class="border-border-default">` : ""}<dl class="flex flex-col gap-3">${detailRows(details)}</dl>`,
		rest: services.length ? homeSection("offered-services", "users", "บริการ", "บริการที่ให้", serviceList(services, variant === "A", "h3").replace("lg:grid-cols-3", "")) : "",
	});
}

const report = (slug) => D.healthReports.find((r) => r.slug === slug);
const service = (slug) => D.services.find((s) => s.slug === slug);
const hs = (slug) => D.healthServices.find((h) => h.slug === slug);
const pageCases = {
	"page-report-full": ["หน้ารายงาน: ครบทุกช่อง", () => reportPage(report("demo-report-dengue-q4")), SHELL.headerHealth],
	"page-report-no-date": ["หน้ารายงาน: ไม่มีวันที่รายงาน", () => reportPage(report("demo-report-performance-2569")), SHELL.headerHealth],
	// MADE_UP: the dengue report with its Document unpublished.
	"page-report-unavailable": ["หน้ารายงาน: เอกสารไม่พร้อมให้บริการ (สมมุติ)", () => reportPage(report("demo-report-dengue-q4"), { unavailable: true }), SHELL.headerHealth],
	"page-service-complaint": ["หน้าบริการ: คำแนะนำครบ + เอกสารที่เกี่ยวข้อง", (v) => servicePage(service("demo-service-complaint"), v), SHELL.headerServices],
	"page-service-flu": ["หน้าบริการ: มีหน่วยบริการที่ให้บริการ 3 แห่ง", (v) => servicePage(service("demo-service-flu-vaccine"), v), SHELL.headerServices],
	"page-service-external": ["หน้าบริการ: ลิงก์ภายนอก ไม่มีคำแนะนำ", (v) => servicePage(service("demo-service-health-rights"), v), SHELL.headerServices],
	"page-health-service-full": ["หน้าหน่วยบริการ: โรงพยาบาล + บริการที่ให้ 3 รายการ", (v) => healthServicePage(hs("demo-health-service-song-hospital"), v), SHELL.headerServices],
	"page-health-service-closed": ["หน้าหน่วยบริการ: ปิดชั่วคราว ไม่มีช่องทางติดต่อ", (v) => healthServicePage(hs("demo-health-service-huai-mai"), v), SHELL.headerServices],
};

// ---------------------------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------------------------
const FAMILIES = {
	services: { A: "การ์ดหน้าแรก · ลิงก์ pill", B: "การ์ดหน้าแรก · ลิงก์ใต้ lead", C: "แถว · ลิงก์ pill", D: "แถว · ลิงก์ใต้ lead" },
	directory: { A: "แถว", B: "การ์ด" },
	reports: { A: "แถว: tile ไอคอน", B: "แถว: tile วันที่" },
	health: { A: "tile แบบหน้าแรก" },
	pages: { A: "บริการเป็นการ์ด / หน่วยบริการเป็นแถว", B: "บริการเป็นแถว / หน่วยบริการเป็นการ์ด" },
};
const cases = [
	{
		file: "health", name: "/health: หน้ารวมข้อมูลสุขภาพ", family: "health", header: SHELL.headerHealth,
		render: () =>
			listPage(
				{ crumbs: [HOME, { label: "ข้อมูลสุขภาพ" }], iconName: "heart-pulse", label: "สุขภาพ", title: "ข้อมูลสุขภาพ", lead: "ความรู้สุขภาพสำหรับประชาชน และรายงานสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย" },
				`<ul class="grid grid-cols-2 gap-3 sm:gap-5">${[["ความรู้สุขภาพ", `${O}/health/content`], ["รายงานสุขภาพ", "reports-full.html"]]
					.map(([label, href]) => `<li class="scroll-reveal"><a class="flex h-full min-h-22 items-center justify-between gap-4 rounded-22 bg-surface-base px-5.5 pt-5.5 pb-5 text-h3 text-text-primary shadow-card hover:text-brand-primary hover:shadow-deep motion-safe:transition-shadow max-sm:min-h-14 max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:rounded-18 max-sm:px-3 max-sm:py-3 max-sm:text-body max-sm:font-semibold max-sm:[&>svg]:self-end" href="${href}"><span class="min-w-0 wrap-anywhere">${label}</span>${icon("arrow-right", 24, "text-brand-primary")}</a></li>`)
					.join("")}</ul>`,
			),
	},
	...Object.entries(servicesCases).map(([file, [name, items, category, hasMore]]) => ({
		file, name, family: "services", header: SHELL.headerServices,
		render: (v) => {
			const [asCards, linksAs] = SERVICE_VARIANTS[v];
			return listPage(
				{ ...SERVICES_HEADING, linksAs },
				filterForm("กรองบริการ", [{ name: "category", label: "หมวดบริการ", any: "ทุกหมวด", value: category, options: category && !SERVICE_CATEGORIES.includes(category) ? [...SERVICE_CATEGORIES, category] : SERVICE_CATEGORIES }], "services-full.html") +
					serviceList(items, asCards) +
					pagination(hasMore),
			);
		},
	})),
	...Object.entries(directoryCases).map(([file, [name, items, filters, hasMore]]) => ({
		file, name, family: "directory", header: SHELL.headerServices,
		render: (v) =>
			listPage(
				DIRECTORY_HEADING,
				filterForm("ค้นหาหน่วยบริการ", [
					{ name: "area", label: "พื้นที่รับผิดชอบ", any: "ทุกพื้นที่", value: filters.area, options: AREAS },
					{ name: "name", label: "ชื่อหน่วยบริการ", text: true, value: filters.name },
				], "directory-full.html") +
					healthServiceList(items, v === "A") +
					pagination(hasMore),
			),
	})),
	...Object.entries(reportCases).map(([file, [name, items, hasMore]]) => ({
		file, name, family: "reports", header: SHELL.headerHealth,
		render: (v) => listPage(REPORTS_HEADING, `<ul class="flex flex-col gap-3.5">${items.map((r) => `<li class="scroll-reveal">${reportRow(r, v)}</li>`).join("")}</ul>${pagination(hasMore)}`),
	})),
	...Object.entries(pageCases).map(([file, [name, render, header]]) => ({ file, name, family: "pages", header, render })),
];

const PROTO_CSS = `
:root{--font-noto-sans-thai:"Noto Sans Thai","Noto Sans",system-ui,sans-serif}
[data-variant][hidden]{display:none}
#proto-bar{position:fixed;left:50%;bottom:14px;translate:-50% 0;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;background:#111;color:#fff;font:500 13px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgb(0 0 0/.35);max-width:calc(100vw - 16px)}
#proto-bar button,#proto-bar select{font:inherit;color:#fff;background:#333;border:0;border-radius:999px;height:30px;padding:0 10px;cursor:pointer}
#proto-bar select{max-width:42vw}
#proto-bar b{padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media print{#proto-bar{display:none}}
`;
const bar = (names) => `<div id="proto-bar" data-proto><button type="button" data-step="-1" aria-label="แบบก่อนหน้า">←</button><b id="proto-label"></b><button type="button" data-step="1" aria-label="แบบถัดไป">→</button>
<select id="proto-case" aria-label="กรณี">${cases.map((c) => `<option value="${c.file}.html">${esc(c.name)}</option>`).join("")}</select></div>
<script>
(() => {
	const names = ${JSON.stringify(names)};
	const keys = Object.keys(names);
	const url = new URL(location.href);
	let current = keys.includes(url.searchParams.get("variant")) ? url.searchParams.get("variant") : keys[0];
	if (url.searchParams.has("nobar")) document.getElementById("proto-bar").remove();
	const show = () => {
		for (const el of document.querySelectorAll("[data-variant]")) el.hidden = el.dataset.variant !== current;
		const label = document.getElementById("proto-label");
		if (label) label.textContent = current + " (" + names[current] + ")";
		url.searchParams.set("variant", current);
		history.replaceState(null, "", url);
	};
	const step = (by) => { current = keys[(keys.indexOf(current) + by + keys.length) % keys.length]; show(); scrollTo(0, 0); };
	for (const button of document.querySelectorAll("#proto-bar button")) button.addEventListener("click", () => step(Number(button.dataset.step)));
	const select = document.getElementById("proto-case");
	if (select) {
		select.value = location.pathname.split("/").pop();
		select.addEventListener("change", () => { location.href = select.value; });
	}
	addEventListener("keydown", (event) => {
		if (event.target.closest("input, textarea, select, [contenteditable]")) return;
		if (event.key === "ArrowLeft") step(-1);
		if (event.key === "ArrowRight") step(1);
	});
	show();
})();
</script>`;

for (const c of cases) {
	const keys = Object.keys(FAMILIES[c.family]);
	const html = `<!doctype html>
<html lang="th" style="--menu-height:calc(7 * 3.5625rem + 1rem)">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PROTOTYPE · ${esc(c.name)}</title><link rel="stylesheet" href="proto.css"></head>
<body class="flex min-h-dvh flex-col bg-bg-page text-body text-text-primary">
${c.header}
<main id="main" tabindex="-1" class="flex-1">
${keys.map((k, i) => `<div data-variant="${k}"${i ? " hidden" : ""}>${c.render(k)}</div>`).join("\n")}
</main>
${SHELL.footer}
${bar(FAMILIES[c.family])}
</body></html>`;
	await writeFile(new URL(`${c.file}.html`, here), html);
}

const globalCss = execFileSync("git", ["show", "origin/main:src/styles/global.css"], { encoding: "utf8" }).replace(
	'@import "tailwindcss" source("../");',
	'@import "tailwindcss" source(none);',
);
const compiler = await compile(globalCss, { base: here.pathname, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: here.pathname, pattern: "*.html", negated: false }] });
await writeFile(new URL("proto.css", here), compiler.build(scanner.scan()) + PROTO_CSS);
console.log(`${cases.length} pages:\n${cases.map((c) => `  ${c.file}.html  ${c.name}`).join("\n")}`);

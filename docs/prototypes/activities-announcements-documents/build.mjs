// PROTOTYPE (throwaway), Feature 010: the Activities list, the Announcements list and page, and the
// Document repository and page, after the Homepage and Feature 009's pages as built in main.
// Two variants of each page, switched by ?variant=A|B and the floating bar, one HTML file per case:
//   /activities      A "การ์ดแบบ /news" (Feature 009's cards)   B "tile แบบหน้าแรก" (HomeActivityTile)
//   /announcements   A "ปิดแล้ว: ป้ายสถานะ"                       B "ปิดแล้ว: ป้ายและกล่องวันที่สีเทา"
//   /documents       A "แถว"                                    B "การ์ด"
//   an Announcement's or a Document's page
//                    A "การ์ดทับขอบพื้นเขียว"                     B "ใต้หัว / ดาวน์โหลดบนพื้นเขียว"
// node .tmp/prototypes/activities-announcements-documents/build.mjs  →  *.html, proto.css
//
// The grill (Product Owner, 2026-11-15, Q1–Q16) fixed everything else: each list's heading on the
// deep field as ListHeading.astro, the Homepage's labels and icons, no pill link, the filter form
// over the field's edge, Feature 009's first-page rule by count, "date • place" on an Activity,
// the Homepage's Announcement row, a Document's download or "ไฟล์ไม่พร้อมให้บริการ", and the Post
// page's header on the field for the two pages. The markup is the built components' own, read from
// the runtime's pages (src/*.html); the stylesheet is main's src/styles/global.css compiled by
// Tailwind over these pages. Content: data.json (extract.mjs); a title that starts "[ตัวอย่าง]" is
// the demo dataset's, and MADE_UP below marks what this prototype invents where a case needs it.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const here = new URL("./", import.meta.url);
const D = JSON.parse(await readFile(new URL("data.json", here), "utf8"));
const SHELL = JSON.parse(await readFile(new URL("shell.json", here), "utf8"));
const O = "http://127.0.0.1:4324";
/** The instant the lists are read at: the day of the grill. */
const NOW = new Date("2026-11-15T05:00:00Z");
const esc = (s) =>
	String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const bkk = (value) => new Date(new Date(value).getTime() + 7 * 3600 * 1000);
/** A date as the site writes it: 23 ก.พ. 2569, in Bangkok's time. */
const thaiDate = (value) => {
	const d = bkk(value);
	return `<time datetime="${esc(value)}">${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}</time>`;
};

const iconCache = new Map();
for (const name of ["heart", "file-text", "folder-open", "download", "arrow-right", "chevron-right", "chevron-left"]) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(name, node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""));
}
const icon = (name, size = 16, cls = "") =>
	`<svg class="shrink-0 ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconCache.get(name)}</svg>`;

// ---------------------------------------------------------------------------------------------
// Pieces that keep their look: breadcrumb, pager, filter form, empty state, details card, rich text
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
const NEWS = { label: "ข่าวสาร", href: `${O}/news` };

const pagerLink =
	"inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-input bg-surface-base px-5 text-label text-brand-primary hover:bg-surface-soft";
function pagination(page, hasMore, prefix) {
	if (page === 1 && !hasMore) return "";
	return `<nav aria-label="การแบ่งหน้า"><ul class="flex flex-wrap items-center justify-between gap-4 max-sm:grid max-sm:grid-cols-[auto_auto]">
<li class="max-sm:col-start-1 max-sm:row-start-2">${page > 1 ? `<a class="${pagerLink}" rel="prev" href="${prefix}-${page - 1}.html">${icon("chevron-left")}หน้าก่อนหน้า</a>` : ""}</li>
<li class="text-label text-text-secondary max-sm:col-span-2 max-sm:row-start-1 max-sm:text-center">หน้า ${page}</li>
<li class="max-sm:col-start-2 max-sm:row-start-2">${hasMore ? `<a class="${pagerLink}" rel="next" href="${prefix}-${page + 1}.html">หน้าถัดไป${icon("chevron-right")}</a>` : ""}</li>
</ul></nav>`;
}
const control = "min-h-11 w-full min-w-0 rounded-14 border border-border-input bg-surface-base px-3 text-body";
function filterForm(label, fields, clearHref) {
	const set = fields.some((f) => f.value);
	return `<form method="get" aria-label="${label}" class="flex flex-col gap-4 rounded-24 bg-surface-base p-5 text-text-primary shadow-card sm:flex-row sm:flex-wrap sm:items-end">${fields
		.map(
			(f) => `<div class="flex min-w-0 flex-col gap-1.5 sm:w-72"><label class="text-label" for="filter-${f.name}">${f.label}</label>
<select id="filter-${f.name}" name="${f.name}" class="${control}"><option value="">${f.any}</option>${f.options.map((o) => `<option${o === f.value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`,
		)
		.join("")}
<div class="flex flex-wrap items-center gap-4"><button type="button" class="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-brand-primary px-6 text-label text-surface-base hover:bg-brand-dark">แสดงผล</button>${
		set ? `<a class="inline-flex min-h-11 items-center rounded-pill border border-border-input bg-surface-soft px-6 text-label text-brand-primary hover:bg-surface-base" href="${clearHref}">ล้างตัวกรอง</a>` : ""
	}</div></form>`;
}
function emptyState(message, action) {
	return `<div class="flex flex-col items-center gap-4 rounded-24 bg-surface-base px-6 py-12 text-center text-text-primary shadow-card"><p class="text-body-large wrap-anywhere">${message}</p>${
		action ? `<a class="inline-flex min-h-11 items-center rounded-pill border border-border-input px-5 text-label text-brand-primary hover:bg-surface-soft" href="${action.href}">${action.label}</a>` : ""
	}</div>`;
}
const detailRows = (rows) =>
	rows
		.filter(([, value]) => value)
		.map(
			([term, value]) =>
				`<div class="flex flex-col gap-1 sm:flex-row sm:gap-6"><dt class="text-label text-text-secondary sm:w-44 sm:shrink-0">${term}</dt><dd class="wrap-anywhere">${value}</dd></div>`,
		)
		.join("");
const detailsCard = (rows, cls = "") =>
	`<dl class="flex max-w-3xl flex-col gap-3 rounded-24 bg-surface-base p-5 text-text-primary shadow-card ${cls}">${detailRows(rows)}</dl>`;

// ---------------------------------------------------------------------------------------------
// The Homepage's and Feature 009's pieces: the field, the heading, the cards
// ---------------------------------------------------------------------------------------------
/** The deep field as DeepField.astro renders it for a list (ring from lg) or a page (no ring). */
const deepField = (inner, ring = true, cls = "") =>
	`<div data-testid="deep-field" class="deep-field focus-ring-on-dark relative overflow-x-clip rounded-b-24 text-surface-base sm:rounded-b-32 sm:[--deep-field-glow:28%_12rem_at_100%_0%] ${cls}"><div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-clip rounded-b-[inherit]">${
		ring ? '<span class="absolute rounded-pill top-15 -right-42.5 size-130 border-[1.5px] border-surface-base/18 max-lg:hidden"></span>' : ""
	}</div>${inner}</div>`;
/** SectionHeading.astro: the icon tile, the slashed label and the heading. */
function sectionHeading({ iconName, label, title, onField, tag = "h2", id }) {
	return `<div class="flex min-w-0 items-center gap-3.5 sm:gap-5"><span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 sm:size-18 sm:rounded-22 ${
		onField ? "bg-accent-warm text-brand-dark" : "bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile"
	}">${icon(iconName, 24)}</span><div class="min-w-0"><p class="mb-1.5 text-label font-semibold tracking-[0.02em] before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/'] ${
		onField ? "text-surface-base" : "text-brand-primary"
	}">${label}</p><${tag}${id ? ` id="${id}"` : ""} class="section-title wrap-anywhere ${onField ? "text-surface-base" : "text-text-primary"}">${esc(title)}</${tag}></div></div>`;
}
/** ListHeading.astro and ListBody.astro around a list's content. */
const listPage = ({ crumbs, iconName, label, title, lead }, body) =>
	deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 pb-24 sm:gap-8 sm:pb-32">${breadcrumb(crumbs, true)}
<div class="flex flex-col gap-5 sm:flex-row sm:justify-between sm:gap-6"><div class="flex min-w-0 flex-col gap-4">${sectionHeading({ iconName, label, title, onField: true, tag: "h1" })}
<p class="max-w-prose text-body-large">${lead}</p></div></div></div>`) +
	`<div class="page-container relative -mt-16 flex flex-col gap-8 pb-16 sm:-mt-22 lg:pb-20">${body}</div>`;

const zoom = "motion-safe:transition-transform motion-safe:duration-600 motion-safe:group-hover:scale-106";
const plainVisual = (iconName) =>
	`<div aria-hidden="true" class="plain-visual absolute inset-0 flex items-center justify-center"><span class="flex size-12 items-center justify-center rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile">${icon(iconName, 24)}</span></div>`;
const deepVisual = (iconName, top = "pt-10") =>
	`<div aria-hidden="true" class="deep-visual pointer-events-none absolute inset-0 flex justify-center ${top}"><span class="relative z-10 flex size-18 items-center justify-center rounded-22 bg-accent-warm text-brand-dark">${icon(iconName, 24)}</span></div>`;

/**
 * Feature 009's first-page rule by count (ContentCardGrid.astro, firstPageLargeCard): the large
 * card spans the row from sm; from lg three columns for one item, two for two, two by two rows
 * for three or more; its least height 300 / 380 / 440 or 520 px.
 */
function largeCell(count) {
	if (count === 1) return "sm:col-span-2 lg:col-span-3 min-h-75 sm:min-h-95 lg:min-h-110";
	if (count === 2) return "sm:col-span-2 min-h-75 sm:min-h-95";
	return "sm:col-span-2 lg:row-span-2 min-h-75 sm:min-h-95 lg:min-h-130";
}
let uid = 0;

// ---------------------------------------------------------------------------------------------
// /activities
// ---------------------------------------------------------------------------------------------
/** The date, a dot and the place, as a list card's line (grill Q10): the date alone without one. */
const dateLine = (item) =>
	`<p class="text-small font-semibold text-brand-primary">${thaiDate(item.date)}${
		item.place
			? `<span aria-hidden="true" class="mx-1.5 text-text-secondary max-sm:hidden">·</span><span class="font-normal wrap-anywhere text-text-secondary max-sm:line-clamp-1 sm:inline">${esc(item.place)}</span>`
			: ""
	}</p>`;
const datePills = (item) =>
	`<p class="mb-2.5 flex flex-wrap items-center gap-2 text-small font-semibold"><span class="rounded-pill bg-accent-warm px-3 py-0.5 text-brand-dark">${thaiDate(item.date)}</span>${
		item.place ? `<span class="line-clamp-1 rounded-pill border border-surface-base/40 bg-brand-dark/40 px-3 py-0.5 wrap-anywhere">${esc(item.place)}</span>` : ""
	}</p>`;
/** Variant A's small card: Feature 009's (ContentCard.astro, kind list). */
function activityCard(item) {
	const id = `c${++uid}`;
	return `<article class="group relative h-full"><div class="flex h-full items-center overflow-hidden rounded-22 bg-surface-base shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:shadow-deep sm:flex-col sm:items-stretch">
<div class="relative m-2.5 aspect-4/3 w-30 shrink-0 overflow-hidden rounded-14 sm:m-0 sm:aspect-video sm:w-auto sm:rounded-none ${item.img ? "picture-shimmer" : "bg-surface-soft"}">${
		item.img ? `<img src="${item.img}" alt="" loading="lazy" class="absolute inset-0 size-full object-cover ${zoom}">` : plainVisual("heart")
	}</div>
<div class="min-w-0 py-2.5 pr-3.5 pl-1 sm:px-5 sm:pt-4 sm:pb-5">${dateLine(item)}<h2 id="${id}" class="mt-0.5 text-body font-semibold wrap-anywhere sm:text-body-large line-clamp-3">${esc(item.title)}</h2>${
		item.summary ? `<p class="mt-1.5 line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(item.summary)}</p>` : ""
	}</div></div><a href="${item.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22 focus-ring-banded"></a></article>`;
}
/** The large card, Feature 009's, with the date and the place as pills. */
function activityLarge(item) {
	const id = `c${++uid}`;
	return `<article class="group relative h-full"><div class="absolute inset-0 overflow-hidden rounded-24 shadow-card ${item.img ? "picture-shimmer" : "bg-surface-soft"}">${
		item.img ? `<img src="${item.img}" alt="" class="absolute inset-0 size-full object-cover ${zoom}">` : deepVisual("heart")
	}<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-brand-dark/96 via-brand-dark/80 via-60% to-transparent px-5 pt-24 pb-5 text-surface-base sm:px-6.5 sm:pb-6">${datePills(item)}
<h2 id="${id}" class="line-clamp-3 text-body-large font-semibold wrap-anywhere sm:text-h3">${esc(item.title)}</h2>${
		item.summary ? `<p class="mt-2 line-clamp-2 max-sm:hidden">${esc(item.summary)}</p>` : ""
	}</div></div><a href="${item.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-24 focus-ring-banded"></a></article>`;
}
/** Variant B's tile: HomeActivityTile.astro, the picture under a brand-dark gradient. */
function activityTile(item, large) {
	const id = `c${++uid}`;
	return `<article class="group relative h-full"><div class="absolute inset-0 overflow-hidden rounded-22 shadow-card ${item.img ? "picture-shimmer" : "bg-surface-soft"}">${
		item.img ? `<img src="${item.img}" alt="" loading="lazy" class="absolute inset-0 size-full object-cover ${zoom}">` : deepVisual("heart", large ? "pt-10" : "pt-5")
	}<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-brand-dark/96 via-brand-dark/85 via-65% to-transparent text-surface-base ${large ? "px-5 pt-20 pb-5 sm:px-6.5 sm:pb-6" : "px-4 pt-16 pb-4 sm:px-5 sm:pb-5"}">${
		large ? datePills(item) : `<div class="max-sm:hidden">${datePills(item)}</div>`
	}<h2 id="${id}" class="line-clamp-2 font-semibold wrap-anywhere ${large ? "text-body-large lg:text-h3" : "text-body sm:text-body-large"}">${esc(item.title)}</h2></div></div><a href="${item.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></article>`;
}
function activitiesGrid(items, { page, variant }) {
	if (items.length === 0) return emptyState("ยังไม่มีกิจกรรม");
	const lead = page === 1;
	if (variant === "A")
		return `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">${items
			.map((item, i) => `<li class="scroll-reveal min-w-0 ${lead && i === 0 ? largeCell(items.length) : ""}">${lead && i === 0 ? activityLarge(item) : activityCard(item)}</li>`)
			.join("")}</ul>`;
	// B: the Homepage's tile rows, 170 px below sm (two to a row), 200 px from sm, 230 px from lg.
	const cell = (i) => {
		if (!lead || i > 0) return "";
		if (items.length === 1) return "col-span-2 row-span-2 lg:col-span-3";
		if (items.length === 2) return "col-span-2 row-span-2 sm:row-span-1 lg:row-span-2";
		return "col-span-2 row-span-2";
	};
	return `<ul class="grid auto-rows-[10.625rem] grid-cols-2 gap-3 sm:auto-rows-[12.5rem] sm:gap-5 lg:grid-cols-3 lg:auto-rows-[14.375rem]">${items
		.map((item, i) => `<li class="scroll-reveal min-w-0 ${cell(i)}">${activityTile(item, lead && i === 0)}</li>`)
		.join("")}</ul>`;
}
const ACTIVITIES = {
	crumbs: [HOME, NEWS, { label: "กิจกรรม" }],
	iconName: "heart",
	label: "ภาพกิจกรรม",
	title: "กิจกรรม",
	lead: "กิจกรรม การประชุม และการลงพื้นที่ของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย",
};
// MADE_UP: the Legacy site's Activities have no place; every third of them gets one here, so the
// cards show both lines. The demo dataset's places are its own.
const PLACES = ["รพ.สต.บ้านกลาง", "ห้องประชุมสำนักงานสาธารณสุขอำเภอสอง", "ศาลาอเนกประสงค์ หมู่ 7 ตำบลสะเอียบ ร่วมกับองค์การบริหารส่วนตำบลสะเอียบ"];
const allActivities = [
	...D.demoActivities.map((a) => ({ href: "page-activity.html", title: a.title, date: a.date, place: a.place, img: a.img, summary: a.summary })),
	...D.legacyActivities.map((a, i) => ({ href: "page-activity.html", title: a.title, date: a.date, place: i % 3 === 0 ? PLACES[(i / 3) % 3] : undefined, img: a.image?.src })),
];
const activityCases = {
	"list-activities-1": ["กิจกรรม หน้า 1 (12 รายการ)", allActivities.slice(0, 12), 1, true],
	"list-activities-2": ["กิจกรรม หน้า 2", allActivities.slice(12, 24), 2, true],
	"list-activities-one": ["กิจกรรม 1 รายการ", allActivities.slice(0, 1), 1, false],
	"list-activities-two": ["กิจกรรม 2 รายการ", allActivities.slice(0, 2), 1, false],
	"list-activities-four": ["กิจกรรม 4 รายการ", allActivities.slice(0, 4), 1, false],
};

// ---------------------------------------------------------------------------------------------
// /announcements and an Announcement's page
// ---------------------------------------------------------------------------------------------
const bangkokDay = (value) => bkk(value).toISOString().slice(0, 10);
/** dated-lists.ts: current through its close day; its status by the Bangkok day. */
const isCurrent = (a) => !a.closes || bangkokDay(a.closes) >= bangkokDay(NOW);
const statusOf = (a) => (!a.opens && !a.closes ? null : !isCurrent(a) ? "closed" : a.opens && bangkokDay(a.opens) > bangkokDay(NOW) ? "upcoming" : "open");
const STATUS_LABELS = { upcoming: "ยังไม่เปิด", open: "เปิดอยู่", closed: "ปิดแล้ว" };
const STATUS_FILL = { upcoming: "bg-accent-warm text-brand-dark", open: "bg-brand-primary text-surface-base", closed: "bg-status-closed text-text-primary" };
const TONE = {
	procurement: "bg-topic-blue text-procurement-text ring-1 ring-procurement-border ring-inset",
	recruitment: "bg-accent-warm text-brand-dark",
	general: "bg-surface-soft text-brand-primary",
};
const toneOf = (a) => (a.type === "procurement" || a.typeLabel === "จัดซื้อจัดจ้าง" ? "procurement" : a.type === "recruitment" || a.typeLabel === "รับสมัคร" ? "recruitment" : "general");
const statusPill = (status) =>
	`<span class="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-px font-semibold ${STATUS_FILL[status]}"><span aria-hidden="true" class="size-1.75 shrink-0 rounded-pill bg-current"></span>${STATUS_LABELS[status]}</span>`;
function statusLine(a, cls = "") {
	const status = statusOf(a);
	if (!status) return "";
	return `<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-secondary ${cls}">${statusPill(status)}${
		status === "upcoming" && a.opens ? `<span>วันที่เริ่มต้น ${thaiDate(a.opens)}</span>` : ""
	}${a.closes ? `<span>วันที่สิ้นสุด ${thaiDate(a.closes)}</span>` : ""}</p>`;
}
/** HomeAnnouncementRow.astro, its title an H2 under the list's H1. B greys a closed one's date tile. */
function announcementRow(a, variant) {
	const id = `c${++uid}`;
	const d = bkk(a.date);
	const grey = variant === "B" && statusOf(a) === "closed";
	return `<article class="group"><div class="relative flex items-center gap-3.5 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-2.5 motion-safe:group-hover:shadow-deep sm:gap-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5">
<p class="flex size-17 shrink-0 flex-col items-center justify-center rounded-14 sm:size-23 sm:rounded-18 ${grey ? "bg-status-closed text-text-primary" : "bg-linear-140 from-brand-primary to-brand-dark text-surface-base"}"><time datetime="${a.date}" class="flex flex-col items-center"><span class="text-h3/7 font-bold sm:text-h2/9.5">${d.getUTCDate()}</span> <span class="text-small ${grey ? "text-text-primary" : "text-accent-warm"}">${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}</span></time></p>
<div class="min-w-0 flex-1">${
		a.typeLabel ? `<p class="mb-1.5 flex"><span class="rounded-pill px-3 py-0.5 text-small font-semibold wrap-anywhere ${TONE[toneOf(a)]}">${esc(a.typeLabel)}</span></p>` : ""
	}<h2 id="${id}" class="line-clamp-2 text-body font-semibold wrap-anywhere sm:text-body-large">${esc(a.title)}</h2>${statusLine(a, "mt-1.5")}</div>
<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-soft text-brand-primary group-hover:bg-accent-warm group-hover:text-brand-dark motion-safe:transition-colors max-sm:hidden">${icon("arrow-right", 20)}</span>
<a href="${a.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22 after:absolute after:inset-y-0 after:right-full after:hidden after:w-2.5 motion-safe:group-hover:after:block"></a></div></article>`;
}
const ANNOUNCEMENTS = {
	crumbs: [HOME, NEWS, { label: "ประกาศ" }],
	iconName: "file-text",
	label: "แจ้งให้ทราบ",
	title: "ประกาศ",
	lead: "ประกาศของสำนักงานสาธารณสุขอำเภอสองที่ประชาชนควรทราบหรือต้องดำเนินการ",
};
// MADE_UP: the Legacy site's Announcements have no open or close dates; these four get past ones,
// so the list shows closed Announcements in number.
const CLOSED = {
	"directive-5": ["2026-06-11T02:00:00Z", "2026-06-20T02:00:00Z"],
	"directive-6": [null, "2026-06-28T02:00:00Z"],
	"procurement-18": ["2026-05-01T02:00:00Z", "2026-05-31T02:00:00Z"],
	"procurement-20": ["2026-07-16T02:00:00Z", "2026-08-15T02:00:00Z"],
};
const allAnnouncements = [
	...D.demoAnnouncements.map((a) => ({ ...a, href: "page-announcement-status.html" })),
	...D.legacyAnnouncements.map((a) => ({ ...a, opens: CLOSED[a.slug]?.[0] ?? undefined, closes: CLOSED[a.slug]?.[1], href: "page-announcement-legacy.html" })),
];
const byDate = (a, b) => new Date(b.date) - new Date(a.date);
const orderedAnnouncements = [...allAnnouncements.filter(isCurrent).sort(byDate), ...allAnnouncements.filter((a) => !isCurrent(a)).sort(byDate)];
const announcementCases = {
	"list-announcements-1": ["ประกาศ หน้า 1 (20 รายการ)", orderedAnnouncements.slice(0, 20), 1, true],
	"list-announcements-2": ["ประกาศ หน้า 2 (ปิดแล้วท้ายรายการ)", orderedAnnouncements.slice(20, 40), 2, false],
};

// ---------------------------------------------------------------------------------------------
// /documents and a Document's page
// ---------------------------------------------------------------------------------------------
const UNAVAILABLE = "ไฟล์ไม่พร้อมให้บริการ";
const ATTENTION = { superseded: "ถูกแทนที่แล้ว", expired: "หมดอายุแล้ว" };
const attentionPill = (status) =>
	`<span class="inline-flex rounded-pill bg-accent-warm px-3 text-label text-brand-dark">${ATTENTION[status]}</span>`;
const fileTile = (file, cls = "size-17 rounded-14 sm:size-23 sm:rounded-18") =>
	`<p aria-hidden="true" class="flex ${cls} shrink-0 flex-col items-center justify-center gap-1 bg-linear-140 from-brand-primary to-brand-dark text-surface-base">${icon("file-text", 24)}<span class="text-small font-semibold text-accent-warm">${esc(file?.kind ?? "ไฟล์")}</span></p>`;
const downloadPill = (file, cls = "") =>
	`<a href="#download" class="relative z-10 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-brand-primary px-5 text-label font-semibold text-surface-base hover:bg-brand-dark motion-safe:transition-colors ${cls}">${icon("download", 20)}<span>ดาวน์โหลด <span class="font-normal">(${esc(file.kind)}, ${esc(file.size)})</span></span></a>`;
const unavailable = (cls = "") => `<p class="relative z-10 text-small font-semibold text-text-secondary ${cls}">${UNAVAILABLE}</p>`;
const metaLine = (doc, withType = true) =>
	[withType && doc.type && esc(doc.type), doc.date && thaiDate(doc.date), doc.fiscalYear && `ปีงบประมาณ ${doc.fiscalYear}`]
		.filter(Boolean)
		.join('<span aria-hidden="true" class="mx-1.5">·</span>');
/** Variant A's row: the file's tile, the facts and the title, and its download at the right. */
function documentRow(doc, tag = "h2") {
	const id = `c${++uid}`;
	return `<article class="group relative"><div class="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:shadow-deep sm:flex-nowrap sm:gap-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5">
${fileTile(doc.file)}
<div class="min-w-0 flex-1"><p class="mb-1 text-small text-text-secondary">${metaLine(doc)}</p>${doc.status ? `<p class="mb-1.5 flex">${attentionPill(doc.status)}</p>` : ""}
<${tag} id="${id}" class="line-clamp-2 text-body font-semibold wrap-anywhere text-text-primary group-hover:text-brand-primary sm:text-body-large">${esc(doc.title)}</${tag}>${
		doc.summary ? `<p class="mt-1 line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(doc.summary)}</p>` : ""
	}</div>
${doc.file ? downloadPill(doc.file, "max-sm:w-full") : unavailable("max-sm:w-full")}
<a href="${doc.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></div></article>`;
}
/** Variant B's card: the tile and the type, the title and the facts, the download at its foot. */
function documentCard(doc) {
	const id = `c${++uid}`;
	return `<article class="group relative h-full"><div class="flex h-full flex-col gap-3 rounded-22 bg-surface-base p-5 shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:shadow-deep">
<div class="flex items-center gap-3">${fileTile(doc.file, "size-13 rounded-16")}<div class="flex min-w-0 flex-wrap gap-2">${
		doc.type ? `<span class="rounded-pill bg-surface-soft px-3 py-0.5 text-small font-semibold wrap-anywhere text-brand-primary">${esc(doc.type)}</span>` : ""
	}${doc.status ? attentionPill(doc.status) : ""}</div></div>
<h2 id="${id}" class="line-clamp-3 text-body-large font-semibold wrap-anywhere">${esc(doc.title)}</h2>
<p class="text-small text-text-secondary">${metaLine(doc, false)}</p>${doc.summary ? `<p class="line-clamp-2 text-label text-text-secondary">${esc(doc.summary)}</p>` : ""}
<div class="mt-auto pt-1">${doc.file ? downloadPill(doc.file, "w-full") : unavailable()}</div>
<a href="${doc.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></div></article>`;
}
const DOCUMENTS = {
	crumbs: [HOME, { label: "เอกสารเผยแพร่" }],
	iconName: "folder-open",
	label: "เข้าถึงข้อมูล",
	title: "เอกสารเผยแพร่",
	lead: "แบบฟอร์ม คู่มือ แผนงาน รายงาน และเอกสารอื่นของสำนักงานสาธารณสุขอำเภอสอง",
};
const STATUS_OF = { "ถูกแทนที่แล้ว": "superseded", "หมดอายุแล้ว": "expired" };
// MADE_UP: one Legacy Document has expired and one has a file that cannot be served, so each
// state shows on a list.
const allDocuments = [
	...D.demoDocuments.map((d) => ({ ...d, status: STATUS_OF[d.status], href: d.status === "ถูกแทนที่แล้ว" ? "page-document-superseded.html" : "page-document-full.html" })),
	...D.legacyDocuments.map((d, i) => ({
		...d,
		status: i === 2 ? "expired" : undefined,
		file: i === 4 ? null : d.file,
		href: i === 4 ? "page-document-unavailable.html" : "page-document-legacy.html",
	})),
].sort(byDate);
const docFields = (type) => [
	{ name: "type", label: "ประเภทเอกสาร", any: "ทุกประเภท", value: type, options: ["นโยบาย", "แบบฟอร์ม", "ผลการดำเนินงาน", "แผนงาน", "รายงาน", "คำสั่ง"] },
	{ name: "topic", label: "ประเด็นสุขภาพ", any: "ทุกประเด็น", value: "", options: ["วัคซีนและการสร้างเสริมภูมิคุ้มกัน"] },
	{ name: "year", label: "ปีงบประมาณ", any: "ทุกปีงบประมาณ", value: "", options: ["2570", "2569", "2568"] },
];
const documentCases = {
	"list-documents-1": ["เอกสาร หน้า 1 (20 รายการ)", allDocuments.slice(0, 20), 1, true, ""],
	"list-documents-2": ["เอกสาร หน้า 2", allDocuments.slice(20, 40), 2, false, ""],
	"list-documents-filtered": ["เอกสาร กรองประเภท แบบฟอร์ม", allDocuments.filter((d) => d.type === "แบบฟอร์ม"), 1, false, "แบบฟอร์ม"],
	"list-documents-none": ["เอกสาร กรองแล้วไม่พบ", [], 1, false, "คำสั่ง"],
};

// ---------------------------------------------------------------------------------------------
// The two pages: the Post page's header on the field (PostHeader.astro), then A or B
// ---------------------------------------------------------------------------------------------
const pills = (parts) => (parts.length ? `<p class="flex flex-wrap items-center gap-2 text-small font-semibold">${parts.join("")}</p>` : "");
const warmPill = (html) => `<span class="rounded-pill border border-transparent bg-accent-warm px-3 py-0.5 text-brand-dark">${html}</span>`;
const outlinePill = (text) => `<span class="rounded-pill border border-surface-base/40 px-3 py-0.5 wrap-anywhere">${esc(text)}</span>`;
function pageHeader({ crumbs, pillParts, title, summary, after = "", bottom }) {
	return `<div class="page-container relative pt-6 ${bottom}"><header class="flex max-w-3xl flex-col gap-6">${breadcrumb(crumbs, true)}
<div class="hero-enter flex flex-col gap-3">${pills(pillParts)}<h1 class="text-h3 wrap-anywhere sm:text-h2 lg:text-h1">${esc(title)}</h1>${
		summary ? `<p class="text-body-large whitespace-pre-line">${esc(summary)}</p>` : ""
	}${after}</div></header></div>`;
}
const textColumn = (html, top) => `<div class="page-container flex flex-col gap-8 ${top}"><div class="flex max-w-3xl flex-col gap-8">${html}</div></div>`;
const relatedDocuments = (docs) =>
	docs.length
		? `<section aria-labelledby="related" class="flex flex-col gap-6">${sectionHeading({ iconName: "folder-open", label: "เอกสารเผยแพร่", title: "เอกสารที่เกี่ยวข้อง", id: "related" })}<ul class="flex flex-col gap-3.5">${docs
				.map((d) => `<li>${documentRow(d, "h3")}</li>`)
				.join("")}</ul></section>`
		: "";
const richText = (html) => (html ? `<div class="rich-text">${html}</div>` : "");

function announcementPage(a, variant) {
	const status = statusOf(a);
	const rows = [
		["ประเภทประกาศ", esc(a.typeLabel)],
		["วันที่ประกาศ", a.date && thaiDate(a.date)],
		["วันที่เริ่มต้น", a.opens && thaiDate(a.opens)],
		["วันที่สิ้นสุด", a.closes && thaiDate(a.closes)],
		["สถานะ", status && `<span class="text-small">${statusPill(status)}</span>`],
	];
	const crumbs = [HOME, NEWS, { label: "ประกาศ", href: "list-announcements-1.html" }, { label: a.title }];
	const head = pageHeader({
		crumbs,
		pillParts: [a.published && warmPill(`เผยแพร่ ${thaiDate(a.published)}`), a.typeLabel && outlinePill(a.typeLabel)].filter(Boolean),
		title: a.title,
		bottom: variant === "A" ? "pb-20 sm:pb-24" : "pb-10 sm:pb-12",
	});
	const rest = [richText(a.body), relatedDocuments(a.docs)].filter(Boolean).join("");
	if (variant === "A")
		return `<article class="pb-16 lg:pb-20">${deepField(head, false)}<div class="page-container relative -mt-12 sm:-mt-14">${detailsCard(rows, "shadow-deep")}</div>${rest ? textColumn(rest, "pt-8 lg:pt-10") : ""}</article>`;
	return `<article class="pb-16 lg:pb-20">${deepField(head, false)}${textColumn(detailsCard(rows) + rest, "pt-8 lg:pt-10")}</article>`;
}

function documentPage(doc, variant) {
	const rows = [
		["ประเภทเอกสาร", esc(doc.type)],
		["วันที่เอกสาร", doc.date && thaiDate(doc.date)],
		["ปีงบประมาณ", doc.fiscalYear],
		["เจ้าของ/แหล่งที่มา", esc(doc.owner)],
		["สถานะเอกสาร", doc.status && `<span class="inline-flex rounded-pill bg-accent-warm px-3 text-label text-brand-dark">${ATTENTION[doc.status]}</span>`],
		["ประเด็นสุขภาพ", doc.topics && `<a class="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4" href="list-documents-1.html">${esc(doc.topics)}</a>`],
	];
	const successor = doc.successor
		? `<p class="max-w-3xl rounded-24 bg-surface-soft p-5 text-brand-dark">เอกสารฉบับถัดไป: <a class="font-semibold wrap-anywhere text-brand-primary underline underline-offset-4" href="page-document-full.html">${esc(doc.successor)}</a></p>`
		: "";
	const pillParts = [doc.type && outlinePill(doc.type), doc.status && warmPill(ATTENTION[doc.status])].filter(Boolean);
	const crumbs = [HOME, { label: "เอกสารเผยแพร่", href: "list-documents-1.html" }, { label: doc.title }];
	const unavailableNotice = (onField) =>
		`<div class="flex flex-col items-start gap-2 rounded-24 p-5 ${onField ? "border border-surface-base/40" : "bg-surface-soft"}"><p class="font-semibold ${onField ? "" : "text-brand-dark"}">${UNAVAILABLE}</p><p class="${onField ? "" : "text-text-secondary-on-soft"}">หากต้องการเอกสารนี้ โปรดติดต่อสำนักงาน</p><a class="text-label underline underline-offset-4 ${onField ? "" : "text-brand-primary"}" href="${O}/contact">ติดต่อเรา</a></div>`;
	if (variant === "A") {
		const fileBlock = doc.file
			? `<div class="flex flex-wrap items-center gap-4">${fileTile(doc.file)}<div class="min-w-0 flex-1"><h2 class="text-body-large font-semibold text-brand-dark">ไฟล์เอกสาร</h2><p class="text-small text-text-secondary">${esc(doc.file.kind)}, ${esc(doc.file.size)}</p></div>${downloadPill(doc.file, "sm:h-13 sm:px-7 max-sm:w-full")}</div>`
			: `<div class="flex flex-col gap-3"><h2 class="text-body-large font-semibold text-brand-dark">ไฟล์เอกสาร</h2>${unavailableNotice(false)}</div>`;
		const head = pageHeader({ crumbs, pillParts, title: doc.title, summary: doc.summary, bottom: "pb-20 sm:pb-24" });
		return `<article class="pb-16 lg:pb-20">${deepField(head, false)}<div class="page-container relative -mt-12 sm:-mt-14"><div class="flex max-w-3xl flex-col gap-5 rounded-24 bg-surface-base p-5 text-text-primary shadow-deep">${fileBlock}<hr class="border-border-default"><dl class="flex flex-col gap-3">${detailRows(rows)}</dl></div></div>${
			successor ? textColumn(successor, "pt-8 lg:pt-10") : ""
		}</article>`;
	}
	const onField = doc.file
		? `<div class="flex flex-wrap items-center gap-3 pt-2"><a href="#download" class="inline-flex h-13 items-center justify-center gap-2 rounded-pill bg-accent-warm px-7 text-body font-semibold text-brand-dark hover:bg-surface-base motion-safe:transition-colors max-sm:w-full">${icon("download", 20)}ดาวน์โหลดเอกสาร</a><span class="text-small">${esc(doc.file.kind)}, ${esc(doc.file.size)}</span></div>`
		: `<div class="pt-2">${unavailableNotice(true)}</div>`;
	const head = pageHeader({ crumbs, pillParts, title: doc.title, summary: doc.summary, after: onField, bottom: "pb-10 sm:pb-12" });
	return `<article class="pb-16 lg:pb-20">${deepField(head, false)}${textColumn(detailsCard(rows) + successor, "pt-8 lg:pt-10")}</article>`;
}

// MADE_UP: an Announcement's details and its attached Documents' summaries are the demo dataset's;
// the Legacy one's two Documents are the Legacy site's, and its details are empty as imported.
const demoStatus = allAnnouncements.find((a) => a.slug === "demo-announcement-quit-smoking-2");
const vhv = allDocuments.find((d) => d.slug === "demo-document-vhv-application");
const legacyFive = allAnnouncements.find((a) => a.slug === "directive-5");
const legacyDocs = (slugs) => slugs.map((s) => allDocuments.find((d) => d.slug === s || d.slug === `${s}-2`)).filter(Boolean);
const pageCases = {
	"page-announcement-status": ["หน้าประกาศ: มีวันที่ สถานะ รายละเอียด และเอกสาร", (v) => announcementPage({ ...demoStatus, docs: [vhv, allDocuments[1]] }, v)],
	"page-announcement-legacy": ["หน้าประกาศ: จากเว็บเดิม ปิดแล้ว ไม่มีรายละเอียด", (v) => announcementPage({ ...legacyFive, docs: [allDocuments.find((d) => d.slug === "directive-5"), allDocuments.find((d) => d.slug === "directive-5-2")].filter(Boolean) }, v)],
	"page-document-full": ["หน้าเอกสาร: ครบทุกช่อง", (v) => documentPage({ ...allDocuments.find((d) => d.topics), owner: "สำนักงานสาธารณสุขอำเภอสอง" }, v)],
	"page-document-superseded": ["หน้าเอกสาร: ถูกแทนที่แล้ว มีฉบับถัดไป", (v) => documentPage({ ...allDocuments.find((d) => d.status === "superseded"), successor: allDocuments.find((d) => d.type === "แผนงาน" && !d.status).title }, v)],
	"page-document-legacy": ["หน้าเอกสาร: จากเว็บเดิม ไม่มีสรุปและประเภท", (v) => documentPage(allDocuments.find((d) => d.slug === "directive-5"), v)],
	"page-document-unavailable": ["หน้าเอกสาร: ไฟล์ไม่พร้อมให้บริการ", (v) => documentPage(allDocuments.find((d) => d.href === "page-document-unavailable.html"), v)],
};

// ---------------------------------------------------------------------------------------------
// The pages
// ---------------------------------------------------------------------------------------------
const FAMILIES = {
	activities: { A: "การ์ดแบบ /news", B: "tile แบบหน้าแรก" },
	announcements: { A: "ปิดแล้ว: ป้ายสถานะ", B: "ปิดแล้ว: ป้ายและกล่องวันที่สีเทา" },
	documents: { A: "แถว", B: "การ์ด" },
	pages: { A: "การ์ดทับขอบพื้นเขียว", B: "ใต้หัว / ดาวน์โหลดบนพื้นเขียว" },
};
const cases = [
	...Object.entries(activityCases).map(([file, [name, items, page, hasMore]]) => ({
		file, name, family: "activities", header: SHELL.header,
		render: (v) => listPage(ACTIVITIES, activitiesGrid(items, { page, variant: v }) + (items.length ? pagination(page, hasMore, "list-activities") : "")),
	})),
	...Object.entries(announcementCases).map(([file, [name, items, page, hasMore]]) => ({
		file, name, family: "announcements", header: SHELL.header,
		render: (v) => listPage(ANNOUNCEMENTS, `<ul class="flex flex-col gap-3.5">${items.map((a) => `<li class="scroll-reveal">${announcementRow(a, v)}</li>`).join("")}</ul>${pagination(page, hasMore, "list-announcements")}`),
	})),
	...Object.entries(documentCases).map(([file, [name, items, page, hasMore, type]]) => ({
		file, name, family: "documents", header: SHELL.headerDocuments,
		render: (v) =>
			listPage(
				DOCUMENTS,
				filterForm("กรองเอกสาร", docFields(type), "list-documents-1.html") +
					(items.length === 0
						? emptyState("ไม่พบเอกสารตามตัวกรองที่เลือก", { href: "list-documents-1.html", label: "ดูเอกสารทั้งหมด" })
						: v === "A"
							? `<ul class="flex flex-col gap-3.5">${items.map((d) => `<li class="scroll-reveal">${documentRow(d)}</li>`).join("")}</ul>`
							: `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">${items.map((d) => `<li class="scroll-reveal min-w-0">${documentCard(d)}</li>`).join("")}</ul>`) +
					(items.length ? pagination(page, hasMore, "list-documents") : ""),
			),
	})),
	...Object.entries(pageCases).map(([file, [name, render]]) => ({
		file, name, family: "pages", header: file.includes("document") ? SHELL.headerDocuments : SHELL.header, render,
	})),
];

const PROTO_CSS = `
:root{--font-noto-sans-thai:"Noto Sans Thai","Noto Sans",system-ui,sans-serif}
[data-variant][hidden]{display:none}
#proto-bar{position:fixed;left:50%;bottom:14px;translate:-50% 0;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;background:#111;color:#fff;font:500 13px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgb(0 0 0/.35);max-width:calc(100vw - 16px)}
#proto-bar button,#proto-bar select{font:inherit;color:#fff;background:#333;border:0;border-radius:999px;height:30px;padding:0 10px;cursor:pointer}
#proto-bar select{max-width:42vw}
#proto-bar b{padding:0 6px;white-space:nowrap}
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
		for (const a of document.querySelectorAll('main a[href$=".html"], main a[href*=".html?"]')) a.href = a.getAttribute("href").split("?")[0] + "?variant=" + current;
	};
	const step = (by) => { current = keys[(keys.indexOf(current) + by + keys.length) % keys.length]; show(); scrollTo(0, 0); };
	for (const button of document.querySelectorAll("#proto-bar button")) button.addEventListener("click", () => step(Number(button.dataset.step)));
	const select = document.getElementById("proto-case");
	if (select) {
		select.value = location.pathname.split("/").pop();
		select.addEventListener("change", () => { location.href = select.value + "?variant=" + current; });
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
	const html = `<!doctype html>
<html lang="th" style="--menu-height:calc(7 * 3.5625rem + 1rem)">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PROTOTYPE · ${esc(c.name)}</title><link rel="stylesheet" href="proto.css"></head>
<body class="flex min-h-dvh flex-col bg-bg-page text-body text-text-primary">
${c.header}
<main id="main" tabindex="-1" class="flex-1">
<div data-variant="A">${c.render("A")}</div>
<div data-variant="B" hidden>${c.render("B")}</div>
</main>
${SHELL.footer}
${bar(FAMILIES[c.family])}
</body></html>`;
	await writeFile(new URL(`${c.file}.html`, here), html);
}

// main's stylesheet over these pages: the tokens and utilities of the built Homepage.
const globalCss = execFileSync("git", ["show", "origin/main:src/styles/global.css"], { encoding: "utf8" }).replace(
	'@import "tailwindcss" source("../");',
	'@import "tailwindcss" source(none);',
);
const compiler = await compile(globalCss, { base: here.pathname, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: here.pathname, pattern: "*.html", negated: false }] });
await writeFile(new URL("proto.css", here), compiler.build(scanner.scan()) + PROTO_CSS);
console.log(`${cases.length} pages:\n${cases.map((c) => `  ${c.file}.html  ${c.name}`).join("\n")}`);

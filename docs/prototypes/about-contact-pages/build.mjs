// PROTOTYPE (throwaway), Feature 012: the About pages, /contact and a Basic Page, after the
// Homepage and Features 008–011's pages as built in main. One HTML file per case, each holding the
// variants switched by ?variant= and the floating bar:
//   /about             A "tile ทับขอบก่อน"   B "เนื้อหาก่อน แล้ว tile ใต้หัว section"   (grill Q9)
//   /about/leadership  A "การ์ดแนวนอน รูปวงกลมมีวงแหวน"   B "การ์ด portrait"   C "คนแรกเด่น + การ์ด A"   (Q10)
//   /about/personnel   A "panel ต่อหน่วยงาน"   B "หัวมีแถบ · การ์ดแนวนอน"   C "หัวมีแถบ · การ์ด portrait"   (Q10, Q11)
//   /contact           A "การ์ดขาว ไอคอนนำแต่ละแถว"   B "การ์ดไล่สีเขียวแบบหน้าแรก"   (Q12)
//   About Documents, Basic Pages: one look each (Q2, Q5)
// node .tmp/prototypes/about-contact-pages/build.mjs  →  *.html, proto.css
//
// The grill (Product Owner, 2026-11-19, Q1–Q15) fixed the rest: a Basic Page takes the Post
// page's header on the field (§9.1) with no pills, tile or frame, and the related Documents as
// Feature 010's section; each list page and /contact take ListHeading with the labels and icons of
// Q4; the About Documents take DocumentDownloadRow over the field's edge; a plain 3/2/1 grid at any
// count (Q14); a list's empty state over the edge, and nothing over it where nothing white follows
// (Q15). The markup copies the built components' classes (ListHeading, SectionHeading,
// HomeQuickLink, DocumentDownloadRow, HomeLeadershipStrip, HomeContactCard, the Post page's
// header); the stylesheet is main's src/styles/global.css compiled by Tailwind over these pages.
// Content: data.json (extract.mjs), the demo dataset's; MADE_UP below marks the filler this
// prototype adds to reach a count, every name and title of it "[ตัวอย่าง]" too (grill Q6).
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

const iconCache = new Map();
for (const name of [
	"arrow-right", "arrow-up-right", "chevron-right", "file-text", "folder-open", "download", "building", "user-round",
	"users-round", "scroll-text", "clipboard-list", "chart-column", "headset", "map-pin", "phone", "mail", "clock",
	"message-square", "hospital", "share-2",
]) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(name, node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""));
}
const icon = (name, size = 16, cls = "") =>
	`<svg class="shrink-0 ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconCache.get(name)}</svg>`;
let uid = 0;
const dot = '<span aria-hidden="true" class="mx-1.5">·</span>';

// ---------------------------------------------------------------------------------------------
// Pieces that keep their look: breadcrumb, pager, empty state
// ---------------------------------------------------------------------------------------------
function breadcrumb(items) {
	return `<nav aria-label="เส้นทางนำทาง"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-surface-base/75">${items
		.map(
			(item, index) =>
				`<li class="flex min-w-0 items-center gap-2">${index > 0 ? icon("chevron-right") : ""}${
					item.href
						? `<a class="underline underline-offset-4 text-surface-base" href="${item.href}">${esc(item.label)}</a>`
						: `<span aria-current="page" class="wrap-anywhere max-sm:truncate text-surface-base">${esc(item.label)}</span>`
				}</li>`,
		)
		.join("")}</ol></nav>`;
}
const HOME = { label: "หน้าแรก", href: `${O}/` };
const ABOUT = { label: "เกี่ยวกับเรา", href: "about-demo.html" };

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
const emptyState = (message) =>
	`<div class="flex flex-col items-center gap-4 rounded-24 bg-surface-base px-6 py-12 text-center shadow-card"><p class="text-body-large wrap-anywhere">${esc(message)}</p></div>`;

// ---------------------------------------------------------------------------------------------
// The field and the headings (DeepField, SectionHeading, ListHeading, the Post page's header)
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
const homeSection = (id, iconName, label, title, html) =>
	`<section aria-labelledby="${id}" class="flex flex-col gap-6 sm:gap-7">${sectionHeading({ iconName, label, title, id })}${html}</section>`;
/**
 * ListHeading.astro and the page's body. `overEdge`: the body's first block lies over the field's
 * lower edge, as on every list (§7.8); otherwise the field ends under the lead and the body
 * follows on the page's colour (grill Q11 B, Q15).
 */
function listPage({ crumbs, iconName, label, title, lead }, body, overEdge = true) {
	return (
		deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 ${overEdge ? "pb-24 sm:pb-32" : "pb-10 sm:pb-12"} sm:gap-8">${breadcrumb(crumbs)}
<div class="flex min-w-0 flex-col gap-4"><div class="hero-enter">${sectionHeading({ iconName, label, title, onField: true, tag: "h1" })}</div>
<p class="hero-enter max-w-prose text-body-large [--hero-enter-delay:0.1s]">${esc(lead)}</p></div></div>`) +
		`<div class="page-container relative ${overEdge ? "-mt-16 sm:-mt-22" : "pt-8 lg:pt-10"} flex flex-col gap-8 pb-16 lg:pb-20">${body}</div>`
	);
}
/** The Post page's header on the field (PostHeader, §9.1) for a Basic Page: no pills, no frame. */
function basicPageHeader({ crumbs, title, summary }, ring = false) {
	return deepField(
		`<div class="page-container relative pt-6 pb-10 sm:pb-12"><header class="flex max-w-3xl flex-col gap-6">${breadcrumb(crumbs)}
<div class="hero-enter flex flex-col gap-3"><h1 class="text-h3 wrap-anywhere sm:text-h2 lg:text-h1">${esc(title)}</h1>${
			summary ? `<p class="text-body-large whitespace-pre-line">${esc(summary)}</p>` : ""
		}</div></header></div>`,
		ring,
	);
}

// ---------------------------------------------------------------------------------------------
// Documents: DocumentDownloadRow (Feature 010) and RelatedDocuments with its downloads
// ---------------------------------------------------------------------------------------------
const TYPE = { policy: "นโยบาย", plan: "แผนงาน", result: "ผลการดำเนินงาน" };
const fileTile = (file) =>
	`<p aria-hidden="true" class="flex size-17 shrink-0 flex-col items-center justify-center gap-1 rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-surface-base sm:size-23 sm:rounded-18">${icon("file-text", 24)}<span class="text-small font-semibold text-accent-warm">${esc(file?.kind ?? "ไฟล์")}</span></p>`;
const downloadLink = (file, context, cls = "") =>
	`<a class="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-brand-primary px-5 py-2 text-center text-label font-semibold text-surface-base hover:bg-brand-dark motion-safe:transition-colors ${cls}" href="#download">${icon("download", 20)}<span>ดาวน์โหลด <span class="font-normal whitespace-nowrap">(${esc(file.kind)}, ${esc(file.size)})</span></span><span class="sr-only"> ${esc(context)}</span></a>`;
function documentRow(doc, tag = "h2") {
	const place = "max-sm:col-span-2 sm:col-start-2 lg:col-start-3 lg:row-start-1";
	const facts = [TYPE[doc.typeSlug] ?? doc.type, doc.date && thaiDate(doc.date), doc.fiscalYear && `ปีงบประมาณ ${doc.fiscalYear}`].filter(Boolean);
	return `<article class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-deep sm:gap-x-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">${fileTile(doc.file)}
<div class="flex min-w-0 flex-col gap-1"><p class="text-small text-text-secondary">${facts.join(dot)}</p>${
		doc.status === "superseded" ? '<p class="flex pb-0.5"><span class="inline-flex rounded-pill bg-accent-warm px-3 text-label text-brand-dark">ถูกแทนที่แล้ว</span></p>' : ""
	}
<${tag} class="text-body font-semibold wrap-anywhere sm:text-body-large"><a class="line-clamp-2 w-fit underline-offset-4 hover:text-brand-primary hover:underline" href="${O}/documents/${doc.slug}">${esc(doc.title)}</a></${tag}>${
		doc.summary ? `<p class="line-clamp-2 text-label text-text-secondary max-sm:hidden">${esc(doc.summary)}</p>` : ""
	}</div>${downloadLink(doc.file, doc.title, `sm:justify-self-start ${place}`)}</article>`;
}
const documentList = (docs, tag = "h2", reveal = true) =>
	`<ul class="flex flex-col gap-3.5">${docs.map((d) => `<li${reveal ? ' class="scroll-reveal"' : ""}>${documentRow(d, tag)}</li>`).join("")}</ul>`;
const relatedDocuments = (docs) =>
	docs.length ? `<div class="max-w-3xl">${homeSection(`related-${++uid}`, "folder-open", "เอกสารเผยแพร่", "เอกสารที่เกี่ยวข้อง", documentList(docs, "h3", false))}</div>` : "";

// ---------------------------------------------------------------------------------------------
// People: the card variants (grill Q10) and the units (Q11)
// ---------------------------------------------------------------------------------------------
const picture = (p, cls) =>
	p.picture
		? `<img src="${esc(p.picture)}" alt="" class="${cls} object-cover object-top">`
		: `<span aria-hidden="true" class="${cls} block bg-surface-soft"></span>`;
const contactBlock = (p) =>
	p.contact
		? `<div class="mt-2 text-small"><p class="font-medium text-text-secondary">ช่องทางติดต่อ</p><p class="wrap-anywhere whitespace-pre-line">${esc(p.contact)}</p></div>`
		: "";
/** A: the white card across, the strip's ringed circle (HomeLeadershipStrip), the first one warm. */
function cardA(p, { tag = "h2", first = false, showUnit = true } = {}) {
	return `<article class="flex h-full items-start gap-4 rounded-24 bg-surface-base p-5 shadow-card sm:gap-5">
<span class="block shrink-0 rounded-full p-1 ${first ? "ring-3 ring-accent-warm" : "ring-2 ring-border-default"}">${picture(p, "size-15 rounded-full sm:size-19")}</span>
<div class="flex min-w-0 flex-col gap-1 pt-1"><${tag} class="text-body-large font-semibold wrap-anywhere text-text-primary">${esc(p.name)}</${tag}>${
		p.assignment ? `<p class="wrap-anywhere text-text-secondary">${esc(p.assignment)}</p>` : ""
	}${showUnit && p.unit ? `<p class="text-small wrap-anywhere text-brand-primary">${esc(p.unit)}</p>` : ""}${contactBlock(p)}</div></article>`;
}
/** B: a portrait card, the picture 4:5 on top, deep-visual without one. */
function cardB(p, { tag = "h2", first = false, showUnit = true } = {}) {
	return `<article class="flex h-full flex-col overflow-clip rounded-24 bg-surface-base shadow-card">${
		p.picture
			? `<img src="${esc(p.picture)}" alt="" class="aspect-4/5 w-full object-cover object-top">`
			: `<span aria-hidden="true" class="deep-visual flex aspect-4/5 w-full items-center justify-center text-surface-base/60">${icon("user-round", 24)}</span>`
	}<div class="relative flex flex-1 flex-col gap-1 p-5">${
		first ? '<span aria-hidden="true" class="absolute -top-1 left-5 h-1 w-12 rounded-pill bg-accent-warm"></span>' : ""
	}<${tag} class="text-body-large font-semibold wrap-anywhere text-text-primary">${esc(p.name)}</${tag}>${
		p.assignment ? `<p class="wrap-anywhere text-text-secondary">${esc(p.assignment)}</p>` : ""
	}${showUnit && p.unit ? `<p class="text-small wrap-anywhere text-brand-primary">${esc(p.unit)}</p>` : ""}${contactBlock(p)}</div></article>`;
}
/** C's first leader: one card across the row, a larger ringed circle, the name at H3 size. */
function featured(p) {
	return `<article class="relative flex flex-col items-start gap-5 overflow-clip rounded-24 bg-surface-base p-6 shadow-deep sm:flex-row sm:items-center sm:gap-8 sm:p-8 lg:px-10">
<span aria-hidden="true" class="pointer-events-none absolute -right-16 -bottom-24 size-60 rounded-pill bg-surface-soft max-sm:hidden"></span>
<span class="relative block shrink-0 rounded-full p-1.5 ring-3 ring-accent-warm">${picture(p, "size-24 rounded-full sm:size-32")}</span>
<div class="relative flex min-w-0 flex-col gap-1.5"><h2 class="text-h3 wrap-anywhere text-text-primary sm:text-h2">${esc(p.name)}</h2>${
		p.assignment ? `<p class="text-body-large wrap-anywhere text-brand-primary">${esc(p.assignment)}</p>` : ""
	}${p.unit ? `<p class="text-small wrap-anywhere text-text-secondary">${esc(p.unit)}</p>` : ""}${contactBlock(p)}</div></article>`;
}
const grid = (items) =>
	`<ul class="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">${items.map((html) => `<li class="scroll-reveal min-w-0">${html}</li>`).join("")}</ul>`;

function leadershipBody(people, v) {
	if (!people.length) return emptyState("ยังไม่มีข้อมูลผู้บริหาร");
	if (v === "A") return grid(people.map((p, i) => cardA(p, { first: i === 0 })));
	if (v === "B") return grid(people.map((p, i) => cardB(p, { first: i === 0 })));
	const [first, ...rest] = people;
	return `<div class="scroll-reveal">${featured(first)}</div>${rest.length ? grid(rest.map((p) => cardA(p))) : ""}`;
}

const NO_UNIT = "ไม่ระบุหน่วยงาน";
const byUnit = (people) => {
	const units = [...new Set(people.filter((p) => p.unit).map((p) => p.unit))].sort((a, b) => a.localeCompare(b, "th"));
	const groups = units.map((unit) => ({ unit, people: people.filter((p) => p.unit === unit) }));
	const none = people.filter((p) => !p.unit);
	if (none.length) groups.push({ unit: null, people: none });
	for (const g of groups) g.people.sort((a, b) => a.name.localeCompare(b.name, "th"));
	return groups;
};
/** Personnel A: one white panel per unit, its H2 over a rule, its people as compact rows inside. */
function unitPanel({ unit, people }, index) {
	return `<section aria-labelledby="unit-${index + 1}" class="scroll-reveal flex flex-col gap-5 rounded-24 bg-surface-base p-5 shadow-card sm:p-7">
<div class="flex items-center gap-3 border-b border-border-default pb-4"><span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-14 bg-surface-soft text-brand-primary">${icon("users-round", 20)}</span><h2 id="unit-${index + 1}" class="text-h3 wrap-anywhere text-text-primary">${esc(unit ?? NO_UNIT)}</h2></div>
<ul class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">${people
		.map(
			(p) =>
				`<li class="flex min-w-0 items-start gap-3.5"><span class="block shrink-0 rounded-full p-0.5 ring-2 ring-border-default">${picture(p, "size-13 rounded-full sm:size-15")}</span><div class="flex min-w-0 flex-col gap-0.5"><h3 class="text-body font-semibold wrap-anywhere">${esc(p.name)}</h3>${
					p.assignment ? `<p class="text-label font-normal wrap-anywhere text-text-secondary">${esc(p.assignment)}</p>` : ""
				}${p.contact ? `<div class="mt-1 text-small"><p class="font-medium text-text-secondary">ช่องทางติดต่อ</p><p class="wrap-anywhere whitespace-pre-line">${esc(p.contact)}</p></div>` : ""}</div></li>`,
		)
		.join("")}</ul></section>`;
}
/** Personnel B and C: the unit's H2 on the page's colour with a brand-primary bar, then cards. */
function unitBlock({ unit, people }, index, card) {
	return `<section aria-labelledby="unit-${index + 1}" class="flex flex-col gap-5"><h2 id="unit-${index + 1}" class="border-l-4 border-brand-primary pl-4 text-h3 wrap-anywhere text-text-primary">${esc(unit ?? NO_UNIT)}</h2>${grid(
		people.map((p) => card(p, { tag: "h3", showUnit: false })),
	)}</section>`;
}
function personnelBody(people, v) {
	if (!people.length) return emptyState("ยังไม่มีข้อมูลบุคลากร");
	const groups = byUnit(people);
	if (v === "A") return `<div class="flex flex-col gap-6">${groups.map(unitPanel).join("")}</div>`;
	return `<div class="flex flex-col gap-12">${groups.map((g, i) => unitBlock(g, i, v === "B" ? cardA : cardB)).join("")}</div>`;
}

// MADE_UP: Personnel to reach the counts of grill Q6; the pictures are the demo's three.
const PICS = D.personnel.map((p) => p.picture).filter(Boolean);
const ROLES = ["นักวิชาการสาธารณสุขปฏิบัติการ", "เจ้าพนักงานสาธารณสุขชำนาญงาน", "นักจัดการงานทั่วไป", "พยาบาลวิชาชีพชำนาญการ", "เจ้าพนักงานธุรการ"];
const UNITS = {
	administration: "กลุ่มงานบริหารทั่วไป",
	prevention: "กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค",
	consumer: "กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข",
	strategy: "กลุ่มงานพัฒนายุทธศาสตร์สาธารณสุข",
	thai: "กลุ่มงานการแพทย์แผนไทยและการแพทย์ทางเลือก",
};
const filler = (n, unit, extra = {}) => ({
	name: `[ตัวอย่าง] บุคลากรลำดับที่ ${String(n).padStart(2, "0")}`,
	assignment: ROLES[n % ROLES.length],
	unit,
	contact: n % 4 === 0 ? `โทร 054 000 000 ต่อ ${100 + n}` : null,
	picture: n % 3 === 0 ? PICS[n % PICS.length] : null,
	...extra,
});
const fillerPeople = [
	...Array.from({ length: 4 }, (_, i) => filler(i + 1, UNITS.administration)),
	...Array.from({ length: 6 }, (_, i) => filler(i + 5, UNITS.prevention)),
	...Array.from({ length: 2 }, (_, i) => filler(i + 11, UNITS.consumer)),
	...Array.from({ length: 5 }, (_, i) => filler(i + 13, UNITS.strategy)),
	...Array.from({ length: 3 }, (_, i) => filler(i + 18, UNITS.thai)),
	filler(21, null),
	filler(22, null, {
		name: "[ตัวอย่าง] ว่าที่ร้อยตรีหญิง ชื่อบุคลากรที่ยาวที่สุดของชุดนี้ นามสกุลยาวเพื่อดูการตัดบรรทัด",
		assignment: "นักวิชาการสาธารณสุขชำนาญการพิเศษ (ด้านการพัฒนาระบบบริการสุขภาพปฐมภูมิ)",
	}),
];
const allPeople = [...D.personnel, ...fillerPeople];
const leaders = D.personnel.filter((p) => p.leadershipOrder != null).sort((a, b) => a.leadershipOrder - b.leadershipOrder);
const fillerLeaders = Array.from({ length: 4 }, (_, i) =>
	filler(30 + i, UNITS.prevention, { name: `[ตัวอย่าง] ผู้บริหารลำดับที่ ${i + 3}`, assignment: "หัวหน้ากลุ่มงาน", picture: PICS[i % PICS.length] }),
);

const LEADERSHIP_HEADING = {
	crumbs: [HOME, ABOUT, { label: "ผู้บริหาร" }], iconName: "user-round", label: "บุคลากร", title: "ผู้บริหาร",
	lead: "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง",
};
const PERSONNEL_HEADING = {
	crumbs: [HOME, ABOUT, { label: "บุคลากร" }], iconName: "users-round", label: "เกี่ยวกับเรา", title: "บุคลากร",
	lead: "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน",
};

// ---------------------------------------------------------------------------------------------
// About Documents (Q5) and the About landing (Q8, Q9)
// ---------------------------------------------------------------------------------------------
const DOC_PAGES = {
	policy: { title: "นโยบาย", icon: "scroll-text", lead: "เอกสารนโยบายของสำนักงานสาธารณสุขอำเภอสอง" },
	plan: { title: "แผนงาน", icon: "clipboard-list", lead: "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง" },
	result: { title: "ผลการดำเนินงาน", icon: "chart-column", lead: "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง" },
};
const docsOf = (type) => Object.values(D.documents).filter((d) => d.typeSlug === type).sort((a, b) => new Date(b.published) - new Date(a.published));
// MADE_UP: plans to fill a first page of twenty with a next page.
const fillerPlans = Array.from({ length: 18 }, (_, i) => ({
	slug: `x-plan-${i}`,
	title: `[ตัวอย่าง] แผนงานโครงการด้านสุขภาพลำดับที่ ${i + 1} ของเครือข่ายบริการสุขภาพอำเภอสอง`,
	summary: i % 3 ? "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง" : null,
	date: new Date(Date.UTC(2025, 9 - i, 10)).toISOString(),
	published: new Date(Date.UTC(2025, 9 - i, 10)).toISOString(),
	fiscalYear: 2568 - Math.floor(i / 6),
	typeSlug: "plan",
	status: null,
	file: { kind: "PDF", size: `${(200 + i * 37) % 900} KB` },
}));
const docPage = (type, docs, hasMore) => (v) => {
	const p = DOC_PAGES[type];
	return listPage(
		{ crumbs: [HOME, ABOUT, { label: p.title }], iconName: p.icon, label: "เกี่ยวกับเรา", title: p.title, lead: p.lead },
		docs.length ? documentList(docs) + pagination(hasMore) : emptyState(`ยังไม่มีเอกสาร${p.title}`),
	);
};

const SUBPAGES = [
	["โครงสร้างองค์กร", "organization.html"], ["ผู้บริหาร", "leadership-demo.html"], ["บุคลากร", "personnel-demo.html"],
	["นโยบาย", "policies-demo.html"], ["แผนงาน", "plans-demo.html"], ["ผลการดำเนินงาน", "results-one.html"],
];
const tiles = `<ul class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">${SUBPAGES.map(
	([label, href]) =>
		`<li class="scroll-reveal min-w-0"><a class="focus-ring-banded flex h-full min-h-22 items-center justify-between gap-4 rounded-22 bg-surface-base px-5.5 pt-5.5 pb-5 text-h3 text-text-primary shadow-card hover:text-brand-primary hover:shadow-deep motion-safe:transition-shadow max-sm:min-h-14 max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:rounded-18 max-sm:px-3 max-sm:py-3 max-sm:text-body max-sm:font-semibold max-sm:[&>svg]:self-end" href="${href}"><h2 class="min-w-0 wrap-anywhere">${label}</h2>${icon("arrow-right", 24, "text-brand-primary")}</a></li>`,
).join("")}</ul>`;
const tilesH3 = tiles.replaceAll("<h2 ", "<h3 ").replaceAll("</h2>", "</h3>");
const body = (html) => (html ? `<div class="max-w-3xl">${html}</div>` : "");
const after = (parts) => {
	const shown = parts.filter(Boolean);
	return shown.length ? `<div class="page-container flex flex-col gap-12 pt-8 pb-16 lg:pt-10 lg:pb-20">${shown.join("")}</div>` : "";
};
function aboutPage(page, v) {
	const title = page?.title ?? "เกี่ยวกับเรา";
	const docs = (page?.documents ?? []).map((s) => D.documents[s]);
	if (v === "A") {
		// The tiles over the field's edge, as /health's; the body and the Documents after them.
		const head = deepField(
			`<div class="page-container relative pt-6 pb-24 sm:pb-32"><header class="flex max-w-3xl flex-col gap-6">${breadcrumb([HOME, { label: "เกี่ยวกับเรา" }])}
<div class="hero-enter flex flex-col gap-3"><h1 class="text-h3 wrap-anywhere sm:text-h2 lg:text-h1">${esc(title)}</h1>${page?.summary ? `<p class="text-body-large">${esc(page.summary)}</p>` : ""}</div></header></div>`,
			true,
		);
		const rest = [body(page?.body), relatedDocuments(docs)].filter(Boolean);
		return `${head}<div class="page-container relative -mt-16 flex flex-col gap-12 pb-16 sm:-mt-22 lg:pb-20">${tiles}${rest.join("")}</div>`;
	}
	return (
		basicPageHeader({ crumbs: [HOME, { label: "เกี่ยวกับเรา" }], title, summary: page?.summary }) +
		after([body(page?.body), homeSection("about-subpages", "building", "เกี่ยวกับเรา", "ข้อมูลเกี่ยวกับสำนักงาน", tilesH3), relatedDocuments(docs)])
	);
}
function basicPage(page, crumbs) {
	const docs = (page.documents ?? []).map((s) => D.documents[s]);
	const html = basicPageHeader({ crumbs, title: page.title, summary: page.summary }) + after([body(page.body), relatedDocuments(docs)]);
	return html.includes("page-container flex flex-col gap-12") ? html : `<div class="pb-16 lg:pb-20">${html}</div>`;
}

// ---------------------------------------------------------------------------------------------
// /contact (Q12)
// ---------------------------------------------------------------------------------------------
const C = D.contact;
const mapHref = (c) => (c.latitude != null && c.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${c.latitude}%2C${c.longitude}` : null);
const telHref = (t) => `tel:${t.replace(/\D/g, "")}`;
const CONTACT_HEADING = {
	crumbs: [HOME, { label: "ติดต่อเรา" }], iconName: "headset", label: "ติดต่อ", title: "ติดต่อเรา", lead: D.contactLead,
};
/** A: the white card over the edge, a row per detail with its 20 px icon on a soft tile (§9.8). */
function contactCardA(c) {
	const row = (iconName, term, html) =>
		`<div class="flex gap-4"><span aria-hidden="true" class="flex size-11 shrink-0 items-center justify-center rounded-14 bg-surface-soft text-brand-primary">${icon(iconName, 20)}</span><div class="flex min-w-0 flex-col gap-0.5 pt-0.5"><dt class="text-label text-text-secondary">${term}</dt><dd class="wrap-anywhere">${html}</dd></div></div>`;
	const map = mapHref(c);
	const rows = [
		(c.address || map) &&
			row("map-pin", "ที่ตั้ง", `<div class="flex flex-col items-start gap-3">${c.address ? `<p class="whitespace-pre-line">${esc(c.address)}</p>` : ""}${
				map ? `<a class="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-input px-5 text-label text-brand-primary hover:bg-surface-soft" href="${map}">เปิดแผนที่${icon("arrow-up-right")}</a>` : ""
			}</div>`),
		c.telephone && row("phone", "โทรศัพท์", `<a class="inline-flex min-h-11 items-center text-h3 font-semibold text-brand-primary underline underline-offset-4" href="${telHref(c.telephone)}">${esc(c.telephone)}</a>`),
		c.email && row("mail", "อีเมล", `<a class="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4 wrap-anywhere" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`),
		c.openingHours && row("clock", "เวลาทำการ", `<p class="whitespace-pre-line">${esc(c.openingHours)}</p>`),
	].filter(Boolean);
	return rows.length
		? `<dl class="grid gap-6 rounded-24 bg-surface-base p-5 text-text-primary shadow-deep sm:grid-cols-2 sm:gap-x-10 sm:p-8">${rows.join("")}</dl>`
		: "";
}
/** B: the Homepage's Contact Summary card (HomeContactCard), with the email and no button. */
function contactCardB(c) {
	const map = mapHref(c);
	const place = c.address || map;
	if (!place && !c.telephone && !c.email && !c.openingHours) return "";
	const telClass = "inline-flex min-h-11 items-center gap-3 text-h2 font-bold wrap-anywhere text-accent-warm sm:text-telephone";
	const item = (iconName, term, html) =>
		`<div><dt class="sr-only">${term}</dt><dd class="flex gap-2.5">${icon(iconName, 20, "mt-1 text-accent-warm")}<div class="flex min-w-0 flex-col items-start wrap-anywhere">${html}</div></dd></div>`;
	return `<div class="focus-ring-on-dark relative grid items-center gap-6 overflow-clip rounded-24 bg-linear-140 from-brand-dark to-brand-primary p-6 text-surface-base shadow-deep ring-4 ring-surface-base sm:p-10 lg:grid-cols-2 lg:gap-x-14 lg:px-14 lg:py-12">
<span aria-hidden="true" class="pointer-events-none absolute -right-20 -bottom-27.5 size-65 rounded-pill border-[1.5px] border-accent-warm/45 max-lg:hidden"></span>
<div class="relative">${c.telephone ? `<dl><div><dt class="sr-only">โทรศัพท์</dt><dd><a class="${telClass}" href="${telHref(c.telephone)}">${icon("phone", 24)}${esc(c.telephone)}</a></dd></div></dl>` : ""}</div>
<dl class="relative flex flex-col gap-2">${[
		place && item("map-pin", "ที่ตั้ง", `${c.address ? `<p class="whitespace-pre-line">${esc(c.address)}</p>` : ""}${map ? `<a class="inline-flex min-h-11 items-center gap-1 font-semibold text-surface-base underline underline-offset-4" href="${map}">เปิดแผนที่${icon("arrow-up-right")}</a>` : ""}`),
		c.email && item("mail", "อีเมล", `<a class="inline-flex min-h-11 items-center text-surface-base underline underline-offset-4" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`),
		c.openingHours && item("clock", "เวลาทำการ", `<p class="whitespace-pre-line">${esc(c.openingHours)}</p>`),
	]
		.filter(Boolean)
		.join("")}</dl></div>`;
}
const channelsSection = (channels) =>
	channels.length
		? homeSection("official-channels", "share-2", "ติดต่อ", "ช่องทางทางการ", `<ul class="flex flex-wrap gap-2.5">${channels
				.map(
					(ch) =>
						`<li><a class="inline-flex min-h-11 items-center gap-2 rounded-pill border-[1.5px] border-border-default bg-surface-base px-5 text-body font-semibold text-brand-primary hover:border-brand-primary hover:bg-brand-primary hover:text-surface-base motion-safe:transition-colors" href="${esc(ch.href)}">${esc(ch.label)}<span class="sr-only">(เว็บไซต์ภายนอก) (เปิดในแท็บใหม่)</span>${icon("arrow-up-right")}</a></li>`,
				)
				.join("")}</ul>`)
		: "";
const routeCard = (iconName, id, heading, text, link, primary) =>
	`<section aria-labelledby="${id}" class="flex h-full flex-col items-start gap-4 rounded-24 bg-surface-base p-6 shadow-card sm:p-7"><span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile">${icon(iconName, 24)}</span><h2 id="${id}" class="text-h3 text-text-primary">${heading}</h2><p class="flex-1 text-text-secondary">${text}</p><a class="inline-flex min-h-11 items-center gap-2 rounded-pill px-5 text-label font-semibold ${
		primary ? "bg-brand-primary text-surface-base hover:bg-brand-dark" : "border border-border-input bg-surface-base text-brand-primary hover:bg-surface-soft"
	}" href="${O}${link[1]}">${link[0]}${icon("arrow-right")}</a></section>`;
const routes = `<div class="grid gap-4 sm:grid-cols-2 sm:gap-5">${routeCard(
	"message-square", "complaints", "ร้องเรียนและเสนอแนะ", "ขั้นตอนและช่องทางการร้องเรียน แจ้งเรื่อง หรือเสนอแนะ อยู่ในบริการประชาชน", ["ดูบริการประชาชน", "/services"], true,
)}${routeCard(
	"hospital", "health-service-contacts", "ติดต่อหน่วยบริการสุขภาพ", "ที่อยู่ เวลาทำการ และช่องทางติดต่อของโรงพยาบาลและ รพ.สต. อยู่ในหน่วยบริการสุขภาพที่เกี่ยวข้อง", ["ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง", "/health-services"], false,
)}</div>`;
const contactPage = (c, channels) => (v) => {
	const card = v === "A" ? contactCardA(c) : contactCardB(c);
	return listPage(CONTACT_HEADING, `${card ? `<div class="max-w-5xl">${card}</div>` : ""}<div class="flex flex-col gap-12 ${card ? "pt-4" : ""}">${channelsSection(channels)}${routes}</div>`, !!card);
};
const EMPTY_CONTACT = { address: null, telephone: null, email: null, openingHours: null, latitude: null, longitude: null };

// ---------------------------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------------------------
const FAMILIES = {
	about: { A: "tile ทับขอบก่อน", B: "เนื้อหาก่อน แล้ว tile ใต้หัว section" },
	leadership: { A: "การ์ดแนวนอน รูปวงกลมมีวงแหวน", B: "การ์ด portrait", C: "คนแรกเด่น + การ์ด A" },
	personnel: { A: "panel ต่อหน่วยงาน", B: "หัวมีแถบ · การ์ดแนวนอน", C: "หัวมีแถบ · การ์ด portrait" },
	contact: { A: "การ์ดขาว ไอคอนนำแต่ละแถว", B: "การ์ดไล่สีเขียวแบบหน้าแรก" },
	one: { A: "แบบเดียว (grill Q2, Q5)" },
};
const P = D.pages;
const cases = [
	{ file: "about-demo", name: "/about: demo (เนื้อหา + เอกสาร 2)", family: "about", header: SHELL.headerAbout, render: (v) => aboutPage(P.about, v) },
	{ file: "about-no-page", name: "/about: ยังไม่มี Basic Page", family: "about", header: SHELL.headerAbout, render: (v) => aboutPage(null, v) },
	...[
		["leadership-demo", "ผู้บริหาร: demo (2)", leaders],
		["leadership-one", "ผู้บริหาร: 1 คน", leaders.slice(0, 1)],
		["leadership-three", "ผู้บริหาร: 3 คน", [...leaders, ...fillerLeaders.slice(0, 1)]],
		["leadership-six", "ผู้บริหาร: 6 คน", [...leaders, ...fillerLeaders]],
		["leadership-empty", "ผู้บริหาร: ไม่มี", []],
	].map(([file, name, people]) => ({ file, name, family: "leadership", header: SHELL.headerAbout, render: (v) => listPage(LEADERSHIP_HEADING, leadershipBody(people, v)) })),
	...[
		["personnel-demo", "บุคลากร: demo (6 คน 3 หน่วยงาน)", D.personnel],
		["personnel-full", `บุคลากร: ${allPeople.length} คน 5 หน่วยงาน + ไม่ระบุ`, allPeople],
		["personnel-empty", "บุคลากร: ไม่มี", []],
	].map(([file, name, people]) => ({
		file, name, family: "personnel", header: SHELL.headerAbout,
		render: (v) => listPage(PERSONNEL_HEADING, personnelBody(people, v), v === "A" || !people.length),
	})),
	{ file: "policies-demo", name: "นโยบาย: demo (2)", family: "one", header: SHELL.headerAbout, render: docPage("policy", docsOf("policy"), false) },
	{ file: "plans-demo", name: "แผนงาน: demo (2, ฉบับหนึ่งถูกแทนที่)", family: "one", header: SHELL.headerAbout, render: docPage("plan", docsOf("plan"), false) },
	{ file: "plans-full", name: "แผนงาน: เต็มหน้า 20 + หน้าถัดไป", family: "one", header: SHELL.headerAbout, render: docPage("plan", [...docsOf("plan"), ...fillerPlans], true) },
	{ file: "results-one", name: "ผลการดำเนินงาน: 1", family: "one", header: SHELL.headerAbout, render: docPage("result", docsOf("result"), false) },
	{ file: "results-empty", name: "ผลการดำเนินงาน: ไม่มี", family: "one", header: SHELL.headerAbout, render: docPage("result", [], false) },
	{ file: "contact-full", name: "/contact: ครบ", family: "contact", header: SHELL.headerNone, render: contactPage(C, D.channels) },
	{ file: "contact-no-channels", name: "/contact: ไม่มีช่องทางทางการ", family: "contact", header: SHELL.headerNone, render: contactPage(C, []) },
	{ file: "contact-empty", name: "/contact: Office Contact ว่าง", family: "contact", header: SHELL.headerNone, render: contactPage(EMPTY_CONTACT, D.channels) },
	{ file: "organization", name: "/about/organization", family: "one", header: SHELL.headerAbout, render: () => basicPage(P.organization, [HOME, ABOUT, { label: P.organization.title }]) },
	{ file: "page-privacy", name: "/pages/privacy", family: "one", header: SHELL.headerNone, render: () => basicPage(P.privacy, [HOME, { label: P.privacy.title }]) },
	{ file: "page-with-documents", name: "Basic Page: มีเอกสารที่เกี่ยวข้อง", family: "one", header: SHELL.headerNone, render: () => basicPage({ ...P.accessibility, documents: ["demo-document-policy-2570", "demo-document-plan-2569"] }, [HOME, { label: P.accessibility.title }]) },
	{ file: "page-no-summary", name: "Basic Page: ไม่มี summary", family: "one", header: SHELL.headerNone, render: () => basicPage({ ...P.accessibility, summary: null }, [HOME, { label: P.accessibility.title }]) },
	{ file: "page-title-only", name: "Basic Page: ไม่มี body และเอกสาร", family: "one", header: SHELL.headerNone, render: () => basicPage({ ...P.privacy, body: null }, [HOME, { label: P.privacy.title }]) },
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

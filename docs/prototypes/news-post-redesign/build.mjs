// PROTOTYPE (throwaway), Feature 009: the News list and the Post page after the Homepage as built.
// Two variants of each page, switched by ?variant=A|B and the floating bar, one HTML file per case.
//   A "ตามหน้าแรกเต็มที่": the heading on the deep green field, white cards over its edge, the
//     newest item as a large card.
//   B "เบากว่า": the heading on the page's colour with the section heading's icon tile, even cards.
// node .tmp/prototypes/news-post-redesign/build.mjs  →  .tmp/prototypes/news-post-redesign/*.html, proto.css
//
// The stylesheet is main's src/styles/global.css compiled by Tailwind over these pages, so every
// colour, radius, type size and utility is the built Homepage's. The header and footer are the
// runtime's own (shell.json). Content: data.json (extract.mjs); a title that starts "[ตัวอย่าง]" is
// the demo dataset's or made up here, and the Legacy site's pictures stand in where a case needs
// one the real content lacks (Product Owner, 2026-11-13).
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
/** A date as the site writes it: 23 ก.พ. 2569, in Bangkok's time. */
function thaiDate(value) {
	const d = new Date(new Date(value).getTime() + 7 * 3600 * 1000);
	return `<time datetime="${esc(value)}">${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}</time>`;
}

const iconCache = new Map();
/** A Lucide icon from the installed package, at one of the sizes DESIGN.md §5 allows. */
async function loadIcon(name) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(
		name,
		node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""),
	);
}
for (const name of ["message-square", "heart-pulse", "heart", "images", "arrow-right", "chevron-right", "chevron-left", "calendar-days"])
	await loadIcon(name);
const icon = (name, size = 16, cls = "") =>
	`<svg class="shrink-0 ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconCache.get(name)}</svg>`;

// ---------------------------------------------------------------------------------------------
// Shared pieces that keep their look (grill Q12): breadcrumb, pager, filter form, empty state,
// rich text, the Activity's details and photos. Their classes are the components' own.
// ---------------------------------------------------------------------------------------------
function breadcrumb(items, onDark = false) {
	return `<nav aria-label="เส้นทางนำทาง"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-small ${onDark ? "text-surface-base/75" : "text-text-secondary"}">${items
		.map(
			(item, index) =>
				`<li class="flex min-w-0 items-center gap-2">${index > 0 ? icon("chevron-right") : ""}${
					item.href
						? `<a class="${onDark ? "text-surface-base" : "text-brand-primary hover:text-brand-dark"} underline underline-offset-4" href="${item.href}">${esc(item.label)}</a>`
						: `<span aria-current="page" class="wrap-anywhere ${onDark ? "text-surface-base" : "text-text-primary"} max-sm:truncate">${esc(item.label)}</span>`
				}</li>`,
		)
		.join("")}</ol></nav>`;
}
const HOME = { label: "หน้าแรก", href: `${O}/` };
const NEWS = { label: "ข่าวสาร", href: "list-news-1.html" };

const pagerLink =
	"inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-input bg-surface-base px-5 text-label text-brand-primary hover:bg-surface-soft";
function pagination(page, hasMore) {
	if (page === 1 && !hasMore) return "";
	return `<nav aria-label="การแบ่งหน้า"><ul class="flex flex-wrap items-center justify-between gap-4 max-sm:grid max-sm:grid-cols-[auto_auto]">
<li class="max-sm:col-start-1 max-sm:row-start-2">${page > 1 ? `<a class="${pagerLink}" rel="prev" href="list-news-${page - 1}.html">${icon("chevron-left")}หน้าก่อนหน้า</a>` : ""}</li>
<li class="text-label text-text-secondary max-sm:col-span-2 max-sm:row-start-1 max-sm:text-center">หน้า ${page}</li>
<li class="max-sm:col-start-2 max-sm:row-start-2">${hasMore ? `<a class="${pagerLink}" rel="next" href="list-news-${page + 1}.html">หน้าถัดไป${icon("chevron-right")}</a>` : ""}</li>
</ul></nav>`;
}

const control = "min-h-11 w-full min-w-0 rounded-14 border border-border-input bg-surface-base px-3 text-body";
function filterForm({ label, options, value, clearHref }) {
	return `<form method="get" aria-label="${label}" class="flex flex-col gap-4 rounded-24 bg-surface-base p-5 text-text-primary shadow-card sm:flex-row sm:flex-wrap sm:items-end">
<div class="flex min-w-0 flex-col gap-1.5 sm:w-72"><label class="text-label" for="filter-topic">ประเด็นสุขภาพ</label>
<select id="filter-topic" name="topic" class="${control}"><option value="">ทุกประเด็น</option>${options.map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
<div class="flex flex-wrap items-center gap-4"><button type="button" class="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-brand-primary px-6 text-label text-surface-base hover:bg-brand-dark">แสดงผล</button>${
		value
			? `<a class="inline-flex min-h-11 items-center rounded-pill border border-border-input bg-surface-soft px-6 text-label text-brand-primary hover:bg-surface-base" href="${clearHref}">ล้างตัวกรอง</a>`
			: ""
	}</div></form>`;
}
function emptyState(message, action) {
	return `<div class="flex flex-col items-center gap-4 rounded-24 bg-surface-base px-6 py-12 text-center text-text-primary shadow-card"><p class="text-body-large wrap-anywhere">${message}</p>${
		action
			? `<a class="inline-flex min-h-11 items-center rounded-pill border border-border-input px-5 text-label text-brand-primary hover:bg-surface-soft" href="${action.href}">${action.label}</a>`
			: ""
	}</div>`;
}
function detailsCard(rows) {
	return `<dl class="flex max-w-3xl flex-col gap-3 rounded-24 bg-surface-base p-5 shadow-card">${rows
		.map(
			([term, value]) =>
				`<div class="flex flex-col gap-1 sm:flex-row sm:gap-6"><dt class="text-label text-text-secondary sm:w-44 sm:shrink-0">${term}</dt><dd class="wrap-anywhere">${value}</dd></div>`,
		)
		.join("")}</dl>`;
}
function photoList(photos) {
	return `<ul class="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">${photos
		.slice(0, 8)
		.map(
			(photo) =>
				`<li><figure class="flex flex-col gap-1"><a class="block overflow-hidden rounded-14" href="${photo.src}"><img src="${photo.src}" alt="" loading="lazy" class="aspect-square w-full bg-surface-soft object-cover"></a>${
					photo.caption ? `<figcaption class="line-clamp-2 text-small wrap-anywhere text-text-secondary">${esc(photo.caption)}</figcaption>` : ""
				}</figure></li>`,
		)
		.join("")}</ul>${
		photos.length > 8
			? `<p><span class="inline-flex min-h-11 w-fit items-center rounded-pill border border-border-input bg-surface-base px-5 text-label text-brand-primary">ดูรูปทั้งหมด (${photos.length} รูป)</span></p>`
			: ""
	}`;
}

// ---------------------------------------------------------------------------------------------
// The Homepage's pieces the variants reuse: the section heading's tile and label, the deep field
// with its still decorations, the small and the large News card.
// ---------------------------------------------------------------------------------------------
/** The section heading's block (SectionHeading.astro), with the page's H1 in place of an H2. */
function heading({ iconName, label, title, surface, tag = "h1", id }) {
	const dark = surface === "field";
	return `<div class="flex min-w-0 items-center gap-3.5 sm:gap-5">
<span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 sm:size-18 sm:rounded-22 ${dark ? "bg-accent-warm text-brand-dark" : "bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile"}">${icon(iconName, 24)}</span>
<div class="min-w-0">${
		label
			? `<p class="mb-1.5 text-label font-semibold tracking-[0.02em] before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/'] ${dark ? "text-surface-base" : "text-brand-primary"}">${label}</p>`
			: ""
	}<${tag}${id ? ` id="${id}"` : ""} class="section-title wrap-anywhere ${dark ? "text-surface-base" : "text-text-primary"}">${esc(title)}</${tag}></div></div>`;
}
/**
 * The deep green field under a page's heading: HomeDeepField.astro's, with a small glow in its
 * upper right corner from sm (the utility's own --deep-field-glow; below sm the utility's phone
 * glow) and the large ring alone, from lg, on a list. A Post page's field has no ring: at 1,024 px
 * it crossed the summary of a post without a picture, 4.35:1.
 * With the Homepage's wide glow, its accent-warm glow and its small ring, the white text of a
 * heading this short measured too low: a lead 3.42:1 at 1,440 px, a Post page's H1 2.89:1 and its
 * summary 3.85:1 at 1,024 px (measure-text-contrast.ts, 2026-11-13).
 */
function deepField(inner, extra = "", ring = true) {
	return `<div class="deep-field focus-ring-on-dark relative overflow-x-clip rounded-b-24 text-surface-base sm:rounded-b-32 sm:[--deep-field-glow:28%_12rem_at_100%_0%] ${extra}">
<div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-clip rounded-b-[inherit]">
${ring ? '<span class="absolute top-15 -right-42.5 size-130 rounded-pill border-[1.5px] border-surface-base/18 max-lg:hidden"></span>' : ""}
</div>${inner}</div>`;
}
const listLink = {
	dark: "focus-ring-on-dark border-surface-base bg-surface-base text-brand-primary hover:border-accent-warm hover:bg-accent-warm hover:text-brand-dark",
	outline:
		"border-border-default bg-surface-base text-brand-primary hover:border-brand-primary hover:bg-brand-primary hover:text-surface-base",
};
/** A pill link with an arrow, as a section's "ทั้งหมด" link, with its words at every width. */
const pillLink = (href, text, tone) =>
	`<a href="${href}" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-pill border-[1.5px] px-5 text-body font-semibold motion-safe:transition-colors sm:h-13 sm:px-7 ${listLink[tone]}">${text}${icon("arrow-right")}</a>`;

const zoom = "motion-safe:transition-transform motion-safe:duration-600 motion-safe:group-hover:scale-106";
const plainVisual = (iconName, tile = "size-12 rounded-14") =>
	`<div aria-hidden="true" class="plain-visual absolute inset-0 flex items-center justify-center"><span class="flex ${tile} items-center justify-center bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile">${icon(iconName, 24)}</span></div>`;

let cardId = 0;
/**
 * A list's card, in the Homepage's small News card: a row with a 120 px picture below sm, a 16:9
 * picture above the text from sm. `meta` says how the date and the label show: "pill" lays the
 * label over the picture's lower edge, as a Homepage Health Content card's topic; "line" writes
 * the date, a dot and the label on one line.
 */
function card(item, { meta, iconName }) {
	const id = `card-${++cardId}`;
	const label = item.label
		? meta === "pill"
			? `<p class="relative mb-1 flex sm:-mt-7 sm:mb-2"><span class="rounded-pill bg-accent-warm px-3 py-0.5 text-small font-semibold wrap-anywhere text-brand-dark">${esc(item.label)}</span></p>`
			: ""
		: "";
	const date = item.date
		? `<p class="text-small font-semibold text-brand-primary">${thaiDate(item.date)}${
				meta === "line" && item.label
					? `<span aria-hidden="true" class="mx-1.5 text-text-secondary">·</span><span class="font-normal wrap-anywhere text-text-secondary">${esc(item.label)}</span>`
					: ""
			}</p>`
		: "";
	return `<article class="group relative h-full scroll-reveal">
<div class="flex h-full items-center overflow-hidden rounded-22 bg-surface-base shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:shadow-deep sm:flex-col sm:items-stretch">
<div class="relative m-2.5 aspect-4/3 w-30 shrink-0 overflow-hidden rounded-14 sm:m-0 sm:aspect-video sm:w-auto sm:rounded-none ${item.img ? "picture-shimmer" : "bg-surface-soft"}">${
		item.img ? `<img src="${item.img}" alt="" loading="lazy" class="absolute inset-0 size-full object-cover ${zoom}">` : plainVisual(iconName)
	}</div>
<div class="min-w-0 py-2.5 pr-3.5 pl-1 sm:px-5 sm:pt-4 sm:pb-5">${label}${date}
<h2 id="${id}" class="mt-0.5 line-clamp-3 text-body font-semibold wrap-anywhere sm:text-body-large">${esc(item.title)}</h2>${
		item.summary ? `<p class="mt-1.5 line-clamp-2 text-label font-normal text-text-secondary max-sm:hidden">${esc(item.summary)}</p>` : ""
	}</div></div>
<a href="${item.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-22"></a></article>`;
}
/** The Homepage's large News card: the picture covers it, the date pill and title over its foot. */
function largeCard(item, { iconName, cls = "" }) {
	const id = `card-${++cardId}`;
	return `<article class="group relative h-full scroll-reveal ${cls}">
<div class="absolute inset-0 overflow-hidden rounded-24 shadow-card ${item.img ? "picture-shimmer" : "bg-surface-soft"}">${
		item.img
			? `<img src="${item.img}" alt="" class="absolute inset-0 size-full object-cover ${zoom}">`
			: `<div aria-hidden="true" class="deep-visual pointer-events-none absolute inset-0 flex justify-center pt-10"><span class="relative z-10 flex size-18 items-center justify-center rounded-22 bg-accent-warm text-brand-dark">${icon(iconName, 24)}</span></div>`
	}
<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-brand-dark/96 via-brand-dark/80 via-60% to-transparent px-5 pt-24 pb-5 text-surface-base sm:px-6.5 sm:pb-6">
<p class="mb-2.5 flex flex-wrap items-center gap-2"><span class="rounded-pill bg-accent-warm px-3 py-0.5 text-small font-semibold text-brand-dark">${thaiDate(item.date)}</span>${
		item.label ? `<span class="rounded-pill border border-surface-base/40 px-3 py-0.5 text-small font-semibold wrap-anywhere">${esc(item.label)}</span>` : ""
	}</p>
<h2 id="${id}" class="line-clamp-3 text-body-large font-semibold wrap-anywhere sm:text-h3">${esc(item.title)}</h2>${
		item.summary ? `<p class="mt-2 line-clamp-2 text-surface-base max-sm:hidden">${esc(item.summary)}</p>` : ""
	}</div></div>
<a href="${item.href}" aria-labelledby="${id}" class="absolute inset-0 rounded-24"></a></article>`;
}

// ---------------------------------------------------------------------------------------------
// The lists
// ---------------------------------------------------------------------------------------------
/**
 * Variant A. The heading is on the deep field, and what follows starts over its lower edge: the
 * filter form where the list has one, else the cards. On an unfiltered first page the newest item
 * is the large card, two columns wide from lg beside the next two, and across the row from sm.
 */
function listA(c, meta = "pill") {
	const lead = c.leadCard && c.items.length > 0;
	const [first, ...rest] = c.items;
	const grid = lead
		? `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
<li class="min-h-75 sm:col-span-2 sm:min-h-95 ${c.items.length === 1 ? "lg:col-span-3 lg:min-h-110" : c.items.length === 2 ? "" : "lg:row-span-2 lg:min-h-130"}">${largeCard(first, c)}</li>
${rest.map((item) => `<li>${card(item, { meta, iconName: c.iconName })}</li>`).join("\n")}</ul>`
		: c.items.length > 0
			? `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">${c.items.map((item) => `<li>${card(item, { meta, iconName: c.iconName })}</li>`).join("\n")}</ul>`
			: emptyState(c.empty.message, c.empty.action);
	return `${deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 pb-24 sm:gap-8 sm:pb-32">
${breadcrumb(c.crumbs, true)}
<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
<div class="flex min-w-0 flex-col gap-4">${heading({ iconName: c.iconName, label: c.labelA, title: c.titleA, surface: "field" })}
<p class="max-w-prose text-body-large text-surface-base">${c.lead}</p></div>
${c.side ? pillLink(c.side.href, c.side.text, "dark") : ""}</div></div>`)}
<div class="page-container relative -mt-16 flex flex-col gap-8 pb-16 sm:-mt-22 lg:pb-20">
${c.filter ? filterForm(c.filter) : ""}
${grid}
${pagination(c.page, c.hasMore)}</div>`;
}
/**
 * Variant B. The heading is on the page's colour, in the section heading's block, and the cards
 * are even: three to a row from lg, two from sm, rows below.
 */
function listB(c) {
	return `<div class="page-container flex flex-col gap-8 pt-6 pb-16 lg:pb-20">
${breadcrumb(c.crumbs)}
<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
<div class="flex min-w-0 flex-col gap-4">${heading({ iconName: c.iconName, label: c.labelB, title: c.titleB })}
<p class="max-w-prose text-body-large text-text-secondary">${c.lead}</p></div>
${c.side ? pillLink(c.side.href, c.side.text, "outline") : ""}</div>
${c.filter ? filterForm(c.filter) : ""}
${
	c.items.length > 0
		? `<ul class="grid gap-3.5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">${c.items.map((item) => `<li>${card(item, { meta: "line", iconName: c.iconName })}</li>`).join("\n")}</ul>`
		: emptyState(c.empty.message, c.empty.action)
}
${pagination(c.page, c.hasMore)}</div>`;
}

// ---------------------------------------------------------------------------------------------
// The Post pages
// ---------------------------------------------------------------------------------------------
const topicChip =
	"rounded-pill border-[1.5px] border-border-default bg-surface-base px-3 py-1 text-small font-medium wrap-anywhere text-brand-primary hover:border-brand-primary hover:bg-brand-primary hover:text-surface-base motion-safe:transition-colors";
const topicPill =
	"inline-flex min-h-11 items-center rounded-pill bg-surface-soft px-4 text-label text-brand-dark underline-offset-4 hover:underline";
function topics(list, chip) {
	if (!list?.length) return "";
	return `<div class="flex flex-col gap-3 border-t border-divider pt-6"><h2 class="text-label">ประเด็นสุขภาพ</h2><ul class="flex flex-wrap gap-2">${list
		.map((t) => `<li class="flex min-w-0"><a class="${chip ? `inline-flex min-h-11 items-center ${topicChip}` : topicPill}" href="list-health-topic.html">${esc(t)}</a></li>`)
		.join("")}</ul></div>`;
}
/** A post's text after its picture: body, source and Health Topics, or nothing. */
function postText(p, chip) {
	const parts = [
		p.body ? `<div class="rich-text">${p.body}</div>` : "",
		p.source ? `<p class="text-text-secondary">แหล่งที่มา: ${esc(p.source)}</p>` : "",
		topics(p.topics, chip),
	].filter(Boolean);
	return parts.length ? parts.join("\n") : "";
}
const fullSize = (p, cls) =>
	`<a class="inline-flex min-h-11 items-center gap-1.5 self-start text-label underline-offset-4 hover:underline ${cls}" href="${p.image.src}">เปิดภาพขนาดเต็ม${icon("chevron-right")}</a>`;
/** The picture whole, in a white frame as the Homepage's Featured card has. */
const framed = (p, shadow) =>
	`<div class="rounded-24 bg-surface-base p-2.5 ${shadow}"><img src="${p.image.src}" width="${p.image.width}" height="${p.image.height}" alt="" class="h-auto w-full rounded-18 bg-surface-soft"><div class="px-2.5 pt-1.5">${fullSize(p, "text-brand-primary")}</div></div>`;

/**
 * Variant A. The header is on the deep field: the breadcrumb, the date and category as pills, the
 * H1 and the summary in white. From lg the framed picture is the right column, starting on the
 * field and running over its lower edge, sticky as today; below lg it follows the header, over
 * the field's edge. The text follows on the page's colour.
 */
function postA(p) {
	const text = postText(p, true);
	const details = p.details ? detailsCard(p.details) : "";
	return `<article class="pa ${p.image ? "pa-pic" : ""}">
${deepField("", "pa-band", false)}
<header class="pa-head focus-ring-on-dark relative flex flex-col gap-6 pt-6 pb-10 text-surface-base sm:pb-12 ${p.image ? "max-lg:pb-20" : ""}">
${breadcrumb(p.crumbs, true)}
<div class="flex max-w-3xl flex-col gap-3">
<p class="flex flex-wrap items-center gap-2">${p.date ? `<span class="rounded-pill bg-accent-warm px-3 py-0.5 text-small font-semibold text-brand-dark">${thaiDate(p.date)}</span>` : ""}${
		p.category ? `<span class="rounded-pill border border-surface-base/40 px-3 py-0.5 text-small font-semibold">${esc(p.category)}</span>` : ""
	}</p>
<h1 class="text-h3 wrap-anywhere sm:text-h2 lg:text-h1">${esc(p.title)}</h1>
${p.summary ? `<p class="text-body-large whitespace-pre-line text-surface-base">${esc(p.summary)}</p>` : ""}
${p.reviewed ? `<p class="text-small text-surface-base">ทบทวนล่าสุด ${thaiDate(p.reviewed)}</p>` : ""}
</div></header>
${p.image ? `<div class="pa-figure relative">${framed(p, "shadow-deep")}</div>` : ""}
${details || text ? `<div class="pa-text flex max-w-3xl flex-col gap-8 pt-8 lg:pt-10">${details}${text}</div>` : ""}
</article>
${
	p.photos
		? `<section aria-labelledby="a-photos" class="page-container flex flex-col gap-6 pt-12 sm:pt-16">${heading({ iconName: "images", label: "กิจกรรม", title: "ภาพกิจกรรม", tag: "h2", id: "a-photos" })}${photoList(p.photos)}</section>`
		: ""
}
<div class="pb-16 lg:pb-20"></div>`;
}
/**
 * Variant B. The header is on the page's colour: the date as a pill and the category as the
 * slashed label, the H1 in the section heading's type. The picture is in a white frame and the
 * text in a white card, in today's two columns.
 */
function postB(p) {
	const text = postText(p, false);
	const details = p.details ? detailsCard(p.details) : "";
	return `<article class="page-container flex flex-col gap-8 pt-6 pb-16 lg:pb-20">
${breadcrumb(p.crumbs)}
<div class="flex flex-col gap-8 ${p.image ? "lg:grid lg:grid-cols-[minmax(0,1fr)_28rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12" : ""}">
<div class="flex flex-col gap-8 lg:col-start-1">
<header class="flex max-w-3xl flex-col gap-3">
<p class="flex flex-wrap items-center gap-x-3 gap-y-2">${p.date ? `<span class="rounded-pill bg-accent-warm px-3 py-0.5 text-small font-semibold text-brand-dark">${thaiDate(p.date)}</span>` : ""}${
		p.category
			? `<span class="text-label font-semibold tracking-[0.02em] text-brand-primary before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/']">${esc(p.category)}</span>`
			: ""
	}</p>
<h1 class="section-title wrap-anywhere text-text-primary">${esc(p.title)}</h1>
${p.summary ? `<p class="text-body-large whitespace-pre-line text-text-secondary">${esc(p.summary)}</p>` : ""}
${p.reviewed ? `<p class="text-small text-text-secondary">ทบทวนล่าสุด ${thaiDate(p.reviewed)}</p>` : ""}
</header>${details}</div>
${p.image ? `<div class="lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1"><div class="max-w-3xl">${framed(p, "shadow-card")}</div></div>` : ""}
${text ? `<div class="lg:col-start-1"><div class="flex max-w-3xl flex-col gap-8 rounded-24 bg-surface-base p-5 shadow-card sm:p-8">${text}</div></div>` : ""}
</div>
${p.photos ? `<section aria-labelledby="b-photos" class="flex flex-col gap-4"><h2 id="b-photos" class="text-h3 text-brand-dark">ภาพกิจกรรม</h2>${photoList(p.photos)}</section>` : ""}
</article>`;
}

// ---------------------------------------------------------------------------------------------
// The content of each case
// ---------------------------------------------------------------------------------------------
const act = (i) => D.legacyActivities[i].image.src;
const legacy = (n, href = "post-news-portrait.html") => ({ href, title: n.title, date: n.date, img: n.image?.src });
const demo = (n, img, href = "post-news-nopic.html") => ({ href, title: n.title, date: n.date, label: n.label, summary: n.summary, img });
const LONG_TITLE =
	"[ตัวอย่าง] ประกาศรายชื่อหมู่บ้านที่ผ่านเกณฑ์การประเมินหมู่บ้านจัดการสุขภาพต้นแบบ ระดับอำเภอ ประจำปีงบประมาณ 2570 พร้อมกำหนดการรับมอบเกียรติบัตรและแนวทางการดำเนินงานต่อเนื่อง";
const [N0, N1, N2, N3, N4, N5] = D.demoNews;
const firstPage = [
	demo(N0, act(0), "post-news-portrait.html"),
	demo(N1, act(1)),
	demo(N2, act(2)),
	demo(N3, undefined),
	{ href: "post-news-nopic.html", title: LONG_TITLE, date: "2026-10-30T02:00:00.000Z", label: "ข่าวประชาสัมพันธ์", img: act(3) },
	demo(N4, act(4)),
	demo(N5, act(5)),
	legacy(D.legacyNews[0], "post-news-onlypic.html"),
	legacy(D.legacyNews[1], "post-news-landscape.html"),
	...D.legacyNews.slice(2, 5).map((n) => legacy(n)),
];
const secondPage = D.legacyNews.slice(5, 17).map((n) => legacy(n));
const NEWS_LIST = {
	iconName: "message-square",
	crumbs: [HOME, { label: "ข่าวสาร" }],
	labelA: "ข่าวสาร",
	titleA: "ข่าวประชาสัมพันธ์",
	labelB: "",
	titleB: "ข่าวสาร",
	lead: "ข่าวและประชาสัมพันธ์จากสำนักงานสาธารณสุขอำเภอสอง",
	side: { href: "list-health-topic.html", text: "ข่าวสุขภาพ" },
	page: 1,
	hasMore: false,
	leadCard: true,
};
const HEALTH_NEWS = {
	iconName: "heart-pulse",
	crumbs: [HOME, NEWS, { label: "ข่าวสุขภาพ" }],
	labelA: "ข่าวสาร",
	titleA: "ข่าวสุขภาพ",
	labelB: "ข่าวสาร",
	titleB: "ข่าวสุขภาพ",
	lead: "ข่าวสารด้านสุขภาพจากสำนักงานสาธารณสุขอำเภอสอง เลือกประเด็นสุขภาพที่สนใจได้",
	page: 1,
	hasMore: false,
	leadCard: false,
};
const TOPIC_OPTIONS = ["ฝุ่น PM2.5", "ไข้เลือดออก", "โรคไม่ติดต่อเรื้อรัง", "วัคซีนและการสร้างเสริมภูมิคุ้มกัน"];
const lists = {
	"list-news-1": ["รายการข่าว หน้า 1 (12 ข่าว)", { ...NEWS_LIST, items: firstPage, hasMore: true }],
	"list-news-2": ["รายการข่าว หน้า 2 (ข่าวจริงจากเว็บเดิม)", { ...NEWS_LIST, items: secondPage, page: 2, hasMore: true, leadCard: false }],
	"list-news-few": ["รายการข่าว มี 3 ข่าว", { ...NEWS_LIST, items: firstPage.slice(0, 3) }],
	"list-news-one": ["รายการข่าว มี 1 ข่าว", { ...NEWS_LIST, items: firstPage.slice(0, 1) }],
	"list-news-two": ["รายการข่าว มี 2 ข่าว", { ...NEWS_LIST, items: firstPage.slice(0, 2) }],
	"list-news-four": ["รายการข่าว มี 4 ข่าว", { ...NEWS_LIST, items: firstPage.slice(0, 4) }],
	"list-health-all": [
		"ข่าวสุขภาพ ยังไม่เลือกประเด็น",
		{
			...HEALTH_NEWS,
			leadCard: true,
			items: [
				{ ...demo(N1, act(1)), label: "โรคไม่ติดต่อเรื้อรัง" },
				{ ...demo(N2, act(2)), label: "ไข้เลือดออก" },
				{ ...demo(N4, act(4)), label: "วัคซีนและการสร้างเสริมภูมิคุ้มกัน" },
				...D.legacyNews.slice(2, 5).map((n) => ({ ...legacy(n), label: "ฝุ่น PM2.5" })),
			],
			filter: { label: "กรองข่าวสุขภาพ", options: TOPIC_OPTIONS, value: "", clearHref: "list-health-all.html" },
		},
	],
	"list-health-topic": [
		"ข่าวสุขภาพ เลือกประเด็นแล้ว",
		{
			...HEALTH_NEWS,
			items: D.legacyNews.slice(2, 7).map((n) => ({ ...legacy(n), label: "ฝุ่น PM2.5" })),
			filter: { label: "กรองข่าวสุขภาพ", options: TOPIC_OPTIONS, value: "ฝุ่น PM2.5", clearHref: "list-health-topic.html" },
		},
	],
	"list-health-none": [
		"ข่าวสุขภาพ ไม่พบผลลัพธ์",
		{
			...HEALTH_NEWS,
			items: [],
			filter: { label: "กรองข่าวสุขภาพ", options: TOPIC_OPTIONS, value: "ไข้เลือดออก", clearHref: "list-health-topic.html" },
			empty: { message: "ไม่พบข่าวสุขภาพในประเด็นนี้", action: { href: "list-health-topic.html", label: "ดูข่าวสุขภาพทุกประเด็น" } },
		},
	],
	"list-content": [
		"รายการความรู้สุขภาพ",
		{
			iconName: "heart-pulse",
			crumbs: [HOME, { label: "ข้อมูลสุขภาพ", href: `${O}/health` }, { label: "ความรู้สุขภาพ" }],
			labelA: "สุขภาพ",
			titleA: "ความรู้สุขภาพ",
			labelB: "สุขภาพ",
			titleB: "ความรู้สุขภาพ",
			lead: "ความรู้ด้านสุขภาพสำหรับประชาชน เลือกประเด็นสุขภาพที่สนใจได้",
			items: D.demoHealth.map((n) => ({ ...n, href: "post-health.html" })),
			filter: { label: "กรองความรู้สุขภาพ", options: TOPIC_OPTIONS.slice(1), value: "", clearHref: "list-content.html" },
			page: 1,
			hasMore: false,
			leadCard: true,
		},
	],
};

const pm = D.legacyNews[2];
const FILLER_BODY = `<p>[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ช่วยลดความรุนแรงของโรคและการนอนโรงพยาบาลในกลุ่มเสี่ยง ควรรับวัคซีนปีละ 1 ครั้ง ก่อนเข้าสู่ฤดูฝนซึ่งเป็นช่วงที่โรคระบาดมากที่สุด</p>
<h2>กลุ่มที่ควรได้รับวัคซีน</h2>
<ul><li>ผู้มีอายุ 65 ปีขึ้นไป</li><li>ผู้ป่วยโรคเรื้อรัง เช่น เบาหวาน หัวใจ ไตวาย หอบหืด</li><li>หญิงตั้งครรภ์อายุครรภ์ 4 เดือนขึ้นไป</li><li>เด็กอายุ 6 เดือนถึง 2 ปี</li></ul>
<h2>สถานที่และเวลาให้บริการ</h2>
<p>รับวัคซีนได้ที่โรงพยาบาลส่งเสริมสุขภาพตำบลใกล้บ้านทุกแห่งในอำเภอสอง ในวันและเวลาราชการ โดยนำบัตรประจำตัวประชาชนมาด้วย สอบถามเพิ่มเติมได้ที่ <a href="#">ช่องทางติดต่อของสำนักงาน</a></p>
<blockquote>ผู้ที่มีไข้หรือเจ็บป่วยเฉียบพลันควรเลื่อนการรับวัคซีนออกไปจนกว่าจะหายเป็นปกติ</blockquote>`;
const newsCrumbs = (title) => [HOME, NEWS, { label: title }];
const posts = {
	"post-news-portrait": [
		"ข่าว: ภาพ One Page แนวตั้ง เนื้อหายาว (ข่าวจริง)",
		{ crumbs: newsCrumbs(pm.title), title: pm.title, date: pm.date, image: pm.image, body: pm.body, source: "สำนักงานสาธารณสุขอำเภอสอง", topics: ["ฝุ่น PM2.5"] },
	],
	"post-news-landscape": [
		"ข่าว: ภาพแนวนอน (ข่าวจริง สรุปและเนื้อหาสมมติ)",
		{
			crumbs: newsCrumbs(D.legacyNews[1].title),
			title: D.legacyNews[1].title,
			date: D.legacyNews[1].date,
			category: "ข่าวประชาสัมพันธ์",
			image: D.legacyNews[1].image,
			summary: "[ตัวอย่าง] ศูนย์บริการแบบเบ็ดเสร็จสำหรับผู้ประกอบการผลิตภัณฑ์สุขภาพ ให้คำปรึกษาและรับคำขออนุญาตในจุดเดียว",
			body: "<p>[ตัวอย่าง] ผู้ประกอบการติดต่อได้ที่สำนักงานสาธารณสุขอำเภอสองในวันและเวลาราชการ</p>",
		},
	],
	"post-news-nopic": [
		"ข่าว: ไม่มีภาพ มีสรุป เนื้อหา แหล่งที่มา ประเด็นสุขภาพ",
		{
			crumbs: newsCrumbs(N4.title),
			title: N4.title,
			date: N4.date,
			category: N4.label,
			summary: N4.summary,
			body: FILLER_BODY,
			source: "สำนักงานสาธารณสุขอำเภอสอง",
			topics: ["วัคซีนและการสร้างเสริมภูมิคุ้มกัน", "ผู้สูงอายุ"],
		},
	],
	"post-news-onlypic": [
		"ข่าว: มีแต่ภาพ ไม่มีสรุปและเนื้อหา (ข่าวจริง)",
		{ crumbs: newsCrumbs(D.legacyNews[0].title), title: D.legacyNews[0].title, date: D.legacyNews[0].date, image: D.legacyNews[0].image },
	],
	"post-activity": [
		"กิจกรรม: รายละเอียดและภาพกิจกรรม 12 รูป",
		{
			crumbs: [HOME, NEWS, { label: "กิจกรรม", href: `${O}/activities` }, { label: D.legacyActivities[0].title }],
			title: D.legacyActivities[0].title,
			date: D.legacyActivities[0].date,
			image: D.legacyActivities[0].image,
			summary: "[ตัวอย่าง] สำนักงานสาธารณสุขอำเภอสองร่วมกับเครือข่ายสุขภาพอำเภอสองจัดกิจกรรมรณรงค์ให้ประชาชนออกกำลังกายและรู้จักสัญญาณเตือนของโรคหลอดเลือดสมอง",
			details: [
				["วันที่จัดกิจกรรม", thaiDate("2026-11-01T02:00:00.000Z")],
				["สถานที่จัดกิจกรรม", "[ตัวอย่าง] ลานอเนกประสงค์ที่ว่าการอำเภอสอง"],
				["ผู้เข้าร่วม", "[ตัวอย่าง] ประชาชนอำเภอสอง เจ้าหน้าที่สาธารณสุข และ อสม. จาก 8 ตำบล"],
			],
			photos: D.legacyActivities.slice(1, 13).map((a, i) => ({ src: a.image.src, caption: i % 3 === 0 ? "[ตัวอย่าง] คำบรรยายภาพกิจกรรม" : "" })),
		},
	],
	"post-health": [
		"ความรู้สุขภาพ: มีวันที่ทบทวน",
		{
			crumbs: [HOME, { label: "ข้อมูลสุขภาพ", href: `${O}/health` }, { label: "ความรู้สุขภาพ", href: "list-content.html" }, { label: D.demoHealth[2].title }],
			title: D.demoHealth[2].title,
			date: D.demoHealth[2].date,
			reviewed: "2026-11-05T02:00:00.000Z",
			summary: D.demoHealth[2].summary,
			image: { src: D.demoHealth[2].img, width: 1200, height: 750 },
			body: FILLER_BODY,
			source: "กรมควบคุมโรค กระทรวงสาธารณสุข",
			topics: ["วัคซีนและการสร้างเสริมภูมิคุ้มกัน"],
		},
	],
};

// ---------------------------------------------------------------------------------------------
// The pages
// ---------------------------------------------------------------------------------------------
const cases = [
	...Object.entries(lists).map(([file, [name, c]]) => ({ file, name, C: listA(c, "line"), A: listA(c), B: listB(c) })),
	...Object.entries(posts).map(([file, [name, p]]) => ({ file, name, C: postA(p), A: postA(p), B: postB(p) })),
];
// C is what the Product Owner picked on 2026-11-13 (P1 to P11): A, with B's date and label line.
const VARIANTS = { C: "ที่เลือก: A + วันที่และหมวดบรรทัดเดียว", A: "ตามหน้าแรกเต็มที่", B: "เบากว่า" };
/** The prototype's own styles: variant A's Post page grid, and the floating bar. */
const PROTO_CSS = `
:root{--font-noto-sans-thai:"Noto Sans Thai","Noto Sans",system-ui,sans-serif}
[data-variant][hidden]{display:none}
/* Variant A's Post page: a full-width grid whose first row is the deep field's height. The header
   is in the content column of that row, and from lg the picture spans both rows at the right. */
.pa{display:grid;grid-template-columns:minmax(var(--page-gutter),1fr) minmax(0,75rem) minmax(var(--page-gutter),1fr)}
.pa>.pa-band{grid-column:1/-1;grid-row:1}
.pa>.pa-head{grid-column:2;grid-row:1}
.pa>.pa-figure{grid-column:2;margin-top:-3rem;max-width:48rem}
.pa>.pa-text{grid-column:2}
@media (width >= 64rem){
.pa.pa-pic{grid-template-columns:minmax(var(--page-gutter),1fr) minmax(0,44rem) 3rem 28rem minmax(var(--page-gutter),1fr);grid-template-rows:auto 1fr}
.pa.pa-pic>.pa-figure{grid-column:4;grid-row:1/span 2;margin-top:4.25rem;position:sticky;top:calc(var(--header-offset) + 1.5rem);align-self:start}
.pa.pa-pic>.pa-text{grid-row:2}
}
#proto-bar{position:fixed;left:50%;bottom:14px;translate:-50% 0;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;background:#111;color:#fff;font:500 13px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgb(0 0 0/.35);max-width:calc(100vw - 16px)}
#proto-bar button,#proto-bar select{font:inherit;color:#fff;background:#333;border:0;border-radius:999px;height:30px;padding:0 10px;cursor:pointer}
#proto-bar select{max-width:42vw}
#proto-bar b{padding:0 6px;white-space:nowrap}
@media print{#proto-bar{display:none}}
`;
const BAR = `<div id="proto-bar" data-proto><button type="button" data-step="-1" aria-label="แบบก่อนหน้า">←</button><b id="proto-label"></b><button type="button" data-step="1" aria-label="แบบถัดไป">→</button>
<select id="proto-case" aria-label="กรณี">${cases.map((c) => `<option value="${c.file}.html">${esc(c.name)}</option>`).join("")}</select></div>
<script>
(() => {
	const names = ${JSON.stringify(VARIANTS)};
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
		for (const a of document.querySelectorAll('main a[href$=".html"]')) a.href = a.getAttribute("href").split("?")[0] + "?variant=" + current;
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
${SHELL.header}
<main id="main" tabindex="-1" class="flex-1">
<div data-variant="C">${c.C}</div>
<div data-variant="A" hidden>${c.A}</div>
<div data-variant="B" hidden>${c.B}</div>
</main>
${SHELL.footer}
${BAR}
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

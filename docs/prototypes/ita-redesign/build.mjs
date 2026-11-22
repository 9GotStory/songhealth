// PROTOTYPE (throwaway), Feature 013: the ITA landing, a fiscal year's page and a MOIT's page,
// after the Homepage and Features 008–012's pages as built in main. One HTML file per case, each
// holding the variants switched by ?variant= and the floating bar:
//   /ita                A "tile แบบ Quick Access ทับขอบ"   B "การ์ดขาวใหญ่ มี tile ไล่สี"          (grill Q5)
//   /ita/{fiscal-year}  A "แถวการ์ดขาวต่อ MOIT"           B "การ์ดใบเดียว มีเส้นคั่น"             (Q5)
//   /ita/{slug}         A "ใต้ field หน้าตาเดิม"           B "ทับขอบ field"                        (Q11)
//                       C "B + eyebrow เป็น pill"         (Q10)
//                       D "B + H1 ไม่เกินขนาด H2"          (found in the prototype: a long title at the
//                                                         Post page's H1 size fills the window)
//                       E "ที่เลือก: B + pill + H1 ไม่เกิน H2"  (the Product Owner's pick, 2026-11-22)
// node .tmp/prototypes/ita-redesign/build.mjs  →  *.html, proto.css
//
// The grill (Product Owner, 2026-11-22, Q1–Q13) fixed the rest: look only (Q1); /ita and a year's
// page take ListHeading with the label "ITA" and shield-check, calendar-check (Q2); a MOIT's page
// takes the Post page's header on the field (Q3), its small text surface-base (Q10); the Evidence
// pills keep their look (Q4); a plain 3/2/1 grid and the empty state over the edge (Q9); the year
// in each tile an H2 (Q12). The markup copies the built components' classes (ListHeading,
// SectionHeading, HomeQuickLink, DocumentDownloadRow, UnitPanel, the Post page's header, today's
// MoitPage); the stylesheet is main's src/styles/global.css compiled by Tailwind over these pages.
// Content: data.json (extract.mjs), the demo dataset's two MOITs as the runtime renders them;
// MADE_UP below marks the filler this prototype adds to reach a count, every title of it
// "[ตัวอย่าง]" too (grill Q6).
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

const iconCache = new Map();
for (const name of [
	"arrow-right", "arrow-up-right", "chevron-right", "chevron-left", "chevron-down", "download", "shield-check",
	"calendar-check", "list-checks",
]) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(name, node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""));
}
const icon = (name, size = 16, cls = "") =>
	`<svg class="shrink-0 ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconCache.get(name)}</svg>`;
const dot = " · ";

// ---------------------------------------------------------------------------------------------
// The field, the breadcrumb and the headings (DeepField, ListHeading, the Post page's header)
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
const ITA = { label: "ITA", href: "ita-three.html" };
const emptyState = (message) =>
	`<div class="flex flex-col items-center gap-4 rounded-24 bg-surface-base px-6 py-12 text-center shadow-card"><p class="text-body-large wrap-anywhere">${esc(message)}</p></div>`;
const deepField = (inner, ring = true) =>
	`<div data-testid="deep-field" class="deep-field focus-ring-on-dark relative overflow-x-clip rounded-b-24 text-surface-base sm:rounded-b-32 sm:[--deep-field-glow:28%_12rem_at_100%_0%]"><div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-clip rounded-b-[inherit]">${
		ring ? '<span class="absolute rounded-pill top-15 -right-42.5 size-130 border-[1.5px] border-surface-base/18 max-lg:hidden"></span>' : ""
	}</div>${inner}</div>`;
function sectionHeading({ iconName, label, title }) {
	return `<div class="flex min-w-0 items-center gap-3.5 sm:gap-5"><span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 bg-accent-warm text-brand-dark sm:size-18 sm:rounded-22">${icon(iconName, 24)}</span><div class="min-w-0"><p class="mb-1.5 text-label font-semibold tracking-[0.02em] text-surface-base before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/']">${label}</p><h1 class="section-title wrap-anywhere text-surface-base">${esc(title)}</h1></div></div>`;
}
/** ListHeading.astro and ListBody.astro: the body's first block lies over the field's lower edge. */
function listPage({ crumbs, iconName, label, title, lead }, body) {
	return (
		deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 pb-24 sm:gap-8 sm:pb-32">${breadcrumb(crumbs)}
<div class="flex min-w-0 flex-col gap-4"><div class="hero-enter">${sectionHeading({ iconName, label, title })}</div>
<p class="hero-enter max-w-prose text-body-large [--hero-enter-delay:0.1s]">${esc(lead)}</p></div></div>`) +
		`<div class="page-container relative -mt-16 flex flex-col gap-8 pb-16 sm:-mt-22 lg:pb-20">${body}</div>`
	);
}

// ---------------------------------------------------------------------------------------------
// The ITA landing, /ita (grill Q2, Q5, Q9, Q12)
// ---------------------------------------------------------------------------------------------
const ITA_HEADING = {
	crumbs: [HOME, { label: "ITA" }], iconName: "shield-check", label: "ITA", title: "การประเมินคุณธรรมและความโปร่งใส (ITA)",
	lead: "การประเมินคุณธรรมและความโปร่งใส (MOPH ITA) คือการประเมินสำนักงานสาธารณสุขอำเภอสองที่กระทรวงสาธารณสุขจัดทุกปี เว็บไซต์นี้เผยแพร่หลักฐานการประเมินของแต่ละปีงบประมาณ",
};
const yearGrid = (items) =>
	`<ul class="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">${items.map((html) => `<li class="scroll-reveal min-w-0">${html}</li>`).join("")}</ul>`;
/** A: the Homepage's Quick Access tile (HomeQuickLink kind="list"), holding the card's three lines. */
const yearTileA = ({ year, count, href }) =>
	`<a class="focus-ring-banded flex h-full min-h-22 items-center justify-between gap-4 rounded-22 bg-surface-base px-5.5 pt-5 pb-4.5 text-text-primary shadow-card hover:text-brand-primary hover:shadow-deep motion-safe:transition-shadow" href="${href}"><div class="flex min-w-0 flex-col"><p class="text-label text-text-secondary">ปีงบประมาณ</p><h2 class="text-h3">${year}</h2><p class="text-small text-text-secondary">ตัวชี้วัด ${count} รายการ</p></div>${icon("arrow-right", 24, "text-brand-primary")}</a>`;
/** B: a large white card, the section heading's gradient tile with calendar-check, the year at H2 size. */
const yearTileB = ({ year, count, href }) =>
	`<a class="group focus-ring-banded relative flex h-full flex-col gap-5 overflow-clip rounded-24 bg-surface-base p-6 text-text-primary shadow-card hover:shadow-deep motion-safe:transition-shadow sm:p-7" href="${href}"><span aria-hidden="true" class="pointer-events-none absolute -right-12 -bottom-14 size-40 rounded-pill bg-surface-soft"></span><span aria-hidden="true" class="relative flex size-13 shrink-0 items-center justify-center rounded-16 bg-linear-140 from-brand-primary to-brand-dark text-accent-warm shadow-tile">${icon("calendar-check", 24)}</span><div class="relative flex flex-col"><p class="text-label text-text-secondary">ปีงบประมาณ</p><h2 class="text-h2 group-hover:text-brand-primary">${year}</h2></div><p class="relative flex items-center justify-between gap-3 text-label font-semibold text-brand-primary"><span>ตัวชี้วัด ${count} รายการ</span>${icon("arrow-right", 20)}</p></a>`;
const itaPage = (years) => (v) =>
	listPage(ITA_HEADING, years.length ? yearGrid(years.map(v === "A" ? yearTileA : yearTileB)) : emptyState("ยังไม่มีข้อมูล ITA"));

// ---------------------------------------------------------------------------------------------
// A fiscal year's page (grill Q2, Q5)
// ---------------------------------------------------------------------------------------------
const yearHeading = (year, count) => ({
	crumbs: [HOME, ITA, { label: `ปีงบประมาณ ${year}` }], iconName: "calendar-check", label: "ITA", title: `ITA ปีงบประมาณ พ.ศ. ${year}`,
	lead: `ตัวชี้วัด MOIT ${count} รายการของปีงบประมาณ พ.ศ. ${year} พร้อมหลักฐานที่เผยแพร่`,
});
/** A: a white row per MOIT, as the Document repository's, its number on the file tile's gradient. */
const moitRowA = (m) =>
	`<li class="scroll-reveal"><article class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-22 bg-surface-base p-3 shadow-card motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-deep sm:gap-x-5.5 sm:py-4.5 sm:pr-5.5 sm:pl-4.5"><p aria-hidden="true" class="flex size-17 shrink-0 flex-col items-center justify-center rounded-14 bg-linear-140 from-brand-primary to-brand-dark text-surface-base sm:size-23 sm:rounded-18"><span class="text-small font-semibold text-accent-warm">MOIT</span><span class="text-h3 sm:text-h2">${m.number}</span></p><div class="flex min-w-0 flex-col gap-1"><h2 class="text-body font-semibold wrap-anywhere sm:text-body-large"><a class="focus-ring-banded underline-offset-4 hover:text-brand-primary hover:underline" href="${m.href}"><span class="sr-only">MOIT ${m.number} </span>${esc(m.title)}</a></h2><p class="text-small text-text-secondary">${m.factsHtml}</p></div>${icon("arrow-right", 20, "text-brand-primary max-sm:hidden")}</article></li>`;
/** B: today's one white card with divider lines, over the field's edge, the badge a soft tile. */
const moitRowB = (m) =>
	`<li><article class="flex items-center gap-4 p-4 sm:p-5"><p aria-hidden="true" class="flex size-13 shrink-0 flex-col items-center justify-center rounded-14 bg-surface-soft text-brand-primary"><span class="text-small font-semibold">MOIT</span><span class="text-body-large leading-none font-semibold">${m.number}</span></p><div class="flex min-w-0 flex-1 flex-col gap-1"><h2 class="text-body-large font-semibold wrap-anywhere text-text-primary"><a class="underline-offset-4 hover:text-brand-primary hover:underline" href="${m.href}"><span class="sr-only">MOIT ${m.number} </span>${esc(m.title)}</a></h2><p class="text-small text-text-secondary">${m.factsHtml}</p></div>${icon("chevron-right", 16, "text-brand-primary")}</article></li>`;
const yearPage = (year, moits) => (v) =>
	listPage(
		yearHeading(year, moits.length),
		v === "A"
			? `<ol class="flex flex-col gap-3.5">${moits.map(moitRowA).join("")}</ol>`
			: `<ol class="flex flex-col divide-y divide-divider rounded-24 bg-surface-base shadow-deep">${moits.map(moitRowB).join("")}</ol>`,
	);

// ---------------------------------------------------------------------------------------------
// A MOIT's page (grill Q3, Q4, Q10, Q11)
// ---------------------------------------------------------------------------------------------
/** The Post page's header on the field (PostHeader, §9.1); `pill`: the year in its outlined pill. */
function moitHeader(m, crumbs, { pill, overEdge, capped }) {
	const eyebrow = pill
		? `<p class="flex flex-wrap items-center gap-2 text-small font-semibold"><span class="rounded-pill border border-surface-base/40 px-3 py-0.5 wrap-anywhere">${esc(m.yearTitle)}</span></p>`
		: `<p data-proto-eyebrow class="text-label font-semibold">${esc(m.yearTitle)}</p>`;
	return deepField(
		`<div class="page-container relative pt-6 ${overEdge ? "pb-24 sm:pb-32" : "pb-10 sm:pb-12"}"><header class="flex max-w-3xl flex-col gap-6">${breadcrumb(crumbs)}
<div class="hero-enter flex flex-col gap-3">${eyebrow}<h1 class="text-h3 wrap-anywhere sm:text-h2 ${capped ? "" : "lg:text-h1"}"><span data-proto-moit-label class="text-accent-warm">MOIT ${m.number}</span> ${esc(m.title)}</h1>${
			m.summary ? `<p class="text-body-large wrap-anywhere whitespace-pre-line">${esc(m.summary)}</p>` : ""
		}<p data-proto-counts class="wrap-anywhere">${m.countsHtml}</p></div></header></div>`,
		false,
	);
}
const neighbourBase = "flex items-center gap-3 rounded-24 bg-surface-base p-5 text-brand-dark shadow-card hover:text-brand-primary";
function neighbours(m, extra = "") {
	if (!m.previous && !m.next) return "";
	const words = (label, n) =>
		`<span class="flex min-w-0 flex-col gap-1"><span class="text-small text-text-secondary">${label}</span><span class="font-semibold wrap-anywhere">MOIT ${n.number} ${esc(n.title)}</span></span>`;
	return `<nav aria-label="ตัวชี้วัดอื่นในปีงบประมาณเดียวกัน" class="grid gap-4 sm:grid-cols-2">${
		m.previous ? `<a class="${neighbourBase} ${extra}" rel="prev" href="${m.previous.href}">${icon("chevron-left", 16, "text-brand-primary")}${words("ตัวชี้วัดก่อนหน้า", m.previous)}</a>` : ""
	}${
		m.next ? `<a class="${neighbourBase} justify-between sm:col-start-2 ${extra}" rel="next" href="${m.next.href}">${words("ตัวชี้วัดถัดไป", m.next)}${icon("chevron-right", 16, "text-brand-primary")}</a>` : ""
	}</nav>`;
}
/** A: today's body (MoitPage.astro) on the page's colour, under the field. */
function moitBodyUnder(m, id) {
	const main = !m.cards.length
		? m.leadHtml
		: `<div class="flex flex-col gap-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-10">
<nav aria-label="สารบัญข้อกำหนด" class="lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-offset)-3rem)] lg:scroll-py-2 lg:overflow-y-auto"><p class="mb-1 text-label text-brand-primary">สารบัญ</p>
<ol class="flex scroll-px-20 gap-2 overflow-x-auto p-1.5 lg:flex-col lg:overflow-visible">${m.cards
				.map(
					(card, i) =>
						`<li class="shrink-0 lg:shrink"><a href="#${id}-requirement-${i + 1}" class="relative flex min-h-11 items-center gap-3 rounded-16 border border-border-default bg-surface-base px-3 py-2 text-label text-brand-dark hover:border-brand-primary"><span class="inline-flex min-w-7 shrink-0 items-center justify-center rounded-pill bg-surface-soft px-1.5 py-0.5 font-semibold">${esc(card.number || "–")}</span><span class="sr-only lg:not-sr-only lg:grow"><span class="line-clamp-2">${esc(card.title)}</span></span><span class="shrink-0 text-text-secondary">${card.count}<span class="sr-only"> รายการ</span></span></a></li>`,
				)
				.join("")}</ol></nav>
<div class="flex flex-col gap-4">${m.leadHtml}${m.cards
				.map(
					(card, i) =>
						`<details id="${id}-requirement-${i + 1}" open class="group rounded-24 bg-surface-base shadow-card"><summary class="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] [&::-webkit-details-marker]:hidden"><h2 class="text-body-large font-semibold wrap-anywhere text-brand-dark">${card.number ? `${esc(card.number)}. ` : ""}${esc(card.title)}</h2><span class="col-start-1 row-start-2 justify-self-start rounded-pill bg-surface-soft px-3 py-1 text-small text-brand-dark sm:col-start-2 sm:row-start-1">${card.count} รายการ</span>${icon("chevron-down", 16, "col-start-2 row-start-1 mt-1.5 text-brand-primary group-open:rotate-180 sm:col-start-3")}</summary>${
							card.bodyHtml ? `<div class="flex flex-col gap-5 px-5 pb-5">${card.bodyHtml}</div>` : ""
						}</details>`,
				)
				.join("")}</div></div>`;
	return `<div class="page-container flex flex-col gap-6 pt-8 pb-16 lg:pt-10 lg:pb-20">${main}${neighbours(m)}</div>`;
}
/**
 * B, C and D: the table of contents in a white panel and the first card over the field's edge; a
 * Requirement's number on a soft tile, as a unit panel's head (UnitPanel); the Evidence before the
 * first Requirement in a white card.
 */
function moitBodyOverEdge(m, id) {
	const lead = m.leadHtml ? `<div class="rounded-24 bg-surface-base p-5 ${m.cards.length ? "shadow-card" : "shadow-deep"} sm:p-6">${m.leadHtml}</div>` : "";
	const main = !m.cards.length
		? lead
		: `<div class="flex flex-col gap-5 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-8">
<nav aria-label="สารบัญข้อกำหนด" class="rounded-24 bg-surface-base p-3 shadow-deep sm:p-4 lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-offset)-3rem)] lg:scroll-py-2 lg:overflow-y-auto"><p class="mb-2 flex items-center gap-2 px-1.5 text-label font-semibold text-brand-primary">${icon("list-checks", 20)}สารบัญ</p>
<ol class="flex scroll-px-20 gap-2 overflow-x-auto p-1.5 lg:flex-col lg:gap-1 lg:overflow-visible">${m.cards
				.map(
					(card, i) =>
						`<li class="shrink-0 lg:shrink"><a href="#${id}-requirement-${i + 1}" class="relative flex min-h-11 items-center gap-3 rounded-14 border border-border-default px-3 py-2 text-label text-brand-dark hover:border-brand-primary lg:border-transparent lg:px-2 lg:hover:bg-surface-soft"><span class="inline-flex min-w-7 shrink-0 items-center justify-center rounded-pill bg-surface-soft px-1.5 py-0.5 font-semibold text-brand-primary">${esc(card.number || "–")}</span><span class="sr-only lg:not-sr-only lg:grow"><span class="line-clamp-2">${esc(card.title)}</span></span><span class="shrink-0 text-text-secondary">${card.count}<span class="sr-only"> รายการ</span></span></a></li>`,
				)
				.join("")}</ol></nav>
<div class="flex flex-col gap-4">${lead}${m.cards
				.map(
					(card, i) =>
						`<details id="${id}-requirement-${i + 1}" open class="group rounded-24 bg-surface-base shadow-card"><summary class="grid cursor-pointer list-none ${card.number ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto]"} items-center gap-x-3.5 gap-y-2 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">${
							card.number ? `<span aria-hidden="true" class="col-start-1 row-start-1 flex size-10 shrink-0 items-center justify-center rounded-14 bg-surface-soft text-body font-semibold text-brand-primary max-sm:self-start">${esc(card.number)}</span>` : ""
						}<h2 class="${card.number ? "col-start-2" : "col-start-1"} row-start-1 text-body-large font-semibold wrap-anywhere text-text-primary">${card.number ? `<span class="sr-only">${esc(card.number)}. </span>` : ""}${esc(card.title)}</h2><span class="${card.number ? "col-start-2 sm:col-start-3" : "col-start-1 sm:col-start-2"} row-start-2 justify-self-start rounded-pill bg-surface-soft px-3 py-1 text-small text-brand-dark sm:row-start-1">${card.count} รายการ</span>${icon("chevron-down", 16, `${card.number ? "col-start-3 sm:col-start-4" : "col-start-2 sm:col-start-3"} row-start-1 text-brand-primary group-open:rotate-180 max-sm:mt-3 max-sm:self-start`)}</summary>${
							card.bodyHtml ? `<div class="flex flex-col gap-5 border-t border-border-default px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5">${card.bodyHtml}</div>` : ""
						}</details>`,
				)
				.join("")}</div></div>`;
	return `<div class="page-container relative -mt-16 flex flex-col gap-6 pb-16 sm:-mt-22 lg:pb-20">${main}${neighbours(m, "border border-transparent hover:border-brand-primary motion-safe:transition-colors")}</div>`;
}
const moitPage = (m, crumbs) => (v) => {
	const overEdge = v !== "A";
	const hasBody = m.cards.length > 0 || Boolean(m.leadHtml);
	return (
		moitHeader(m, crumbs, { pill: v === "C" || v === "E", overEdge: overEdge && hasBody, capped: v === "D" || v === "E" }) +
		(overEdge && hasBody ? moitBodyOverEdge(m, `v${v}`) : moitBodyUnder(m, `v${v}`))
	);
};

// The Evidence pills of the made-up MOIT, in EvidencePills.astro's classes (their look stays, Q4).
const pillBox = "inline-flex min-h-11 max-w-full items-center gap-2 rounded-24 px-4 py-2 text-label";
const pillLink = `${pillBox} border border-border-default bg-surface-soft text-brand-dark hover:border-brand-primary hover:bg-surface-base`;
const pillInner = (round, label, detail) =>
	`<span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">${round ? `<span class="rounded-pill bg-brand-dark px-2 text-small text-surface-base">${round}</span>` : ""}<span class="wrap-anywhere">${esc(label)}</span>${detail ? `<span class="wrap-anywhere text-text-secondary-on-soft">${esc(detail)}</span>` : ""}</span>`;
const pills = (items) =>
	`<ul class="flex flex-wrap gap-2">${items
		.map(([kind, round, label, detail]) =>
			kind === "file"
				? `<li class="max-w-full"><a class="${pillLink}" href="#file">${icon("download", 20, "text-brand-primary")}${pillInner(round, label, detail)}</a></li>`
				: kind === "page"
					? `<li class="max-w-full"><a class="${pillLink}" href="#page">${pillInner(round, label, detail)}${icon("chevron-right")}</a></li>`
					: `<li class="max-w-full"><a class="${pillLink}" href="#external">${pillInner(round, label, `${detail} (เว็บไซต์ภายนอก)`)}<span class="sr-only">(เปิดในแท็บใหม่)</span>${icon("arrow-up-right")}</a></li>`,
		)
		.join("")}</ul>`;

// ---------------------------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------------------------
const [demo1, demo2] = D.moits;
demo1.href = "moit-demo-1.html";
demo2.href = "moit-demo-2.html";
demo1.next = demo2;
demo2.previous = demo1;

// MADE_UP: fiscal year 2569 with twenty-two MOITs and 2568 with one, to reach the counts of grill
// Q6. Every title is "[ตัวอย่าง]", and none is the MOPH manual's or the Legacy site's wording.
const TOPICS = [
	"การเผยแพร่ข้อมูลพื้นฐานของหน่วยงาน", "การเปิดเผยแผนการจัดซื้อจัดจ้างประจำปี", "รายงานผลการจัดซื้อจัดจ้างรายเดือน",
	"นโยบายการบริหารทรัพยากรบุคคล", "รายงานผลการบริหารทรัพยากรบุคคล", "ช่องทางรับเรื่องร้องเรียนและการจัดการ",
	"การเปิดโอกาสให้ผู้มีส่วนได้ส่วนเสียมีส่วนร่วม", "มาตรการป้องกันการรับสินบน",
];
const made = (year, number, extra = {}) => ({
	number,
	title: `[ตัวอย่าง] ตัวชี้วัดลำดับที่ ${number}: ${TOPICS[number % TOPICS.length]}`,
	href: "#moit",
	factsHtml: `หลักฐาน ${3 + ((number * 7) % 19)} รายการ${number % 4 === 0 ? "" : `${dot}ปรับปรุงล่าสุด <time>${1 + ((number * 5) % 27)} ต.ค. ${year - 1}</time>`}`,
	...extra,
});
const year2569 = Array.from({ length: 22 }, (_, i) => made(2569, i + 1));
year2569[8] = made(2569, 9, {
	title: "[ตัวอย่าง] ตัวชี้วัดที่มีชื่อยาวที่สุดของปีนี้ เพื่อดูการตัดบรรทัดของชื่อ: หน่วยงานมีการกำหนดมาตรการ กลไก และระบบการกำกับติดตามการเผยแพร่ข้อมูลต่อสาธารณะผ่านเว็บไซต์ของหน่วยงานอย่างต่อเนื่องตลอดปีงบประมาณ",
});
const year2568 = [made(2568, 1)];
const leadOnly = {
	yearTitle: "ITA ปีงบประมาณ พ.ศ. 2569", number: 5, title: year2569[4].title, summary: null,
	countsHtml: "หลักฐาน 4 รายการ",
	leadHtml: pills([
		["file", "รอบ 6 เดือน", "[ตัวอย่าง] รายงานผลรอบ 6 เดือน", "PDF, 245 KB"],
		["file", "รอบ 12 เดือน", "[ตัวอย่าง] รายงานผลรอบ 12 เดือน", "PDF, 1.2 MB"],
		["page", null, "[ตัวอย่าง] หน้าช่องทางร้องเรียนของสำนักงาน", "หน้าเว็บของสำนักงาน"],
		["external", null, "[ตัวอย่าง] ระบบของหน่วยงานต้นสังกัด", "example.go.th"],
	]),
	cards: [],
	previous: { ...year2569[3], href: "#previous" },
	next: { ...year2569[5], href: "#next" },
};
year2569[4].href = "moit-lead-only.html";
// A MOIT in preview whose year has no page yet: no year crumb, no neighbours, no summary, no date.
const longTitle = {
	...demo1, number: 12, summary: null, previous: undefined, next: undefined,
	title: year2569[8].title,
	countsHtml: "หลักฐาน 7 รายการ ใน 2 ข้อ · ไฟล์ที่ไม่พร้อมให้บริการ 1",
};

const years3 = [
	{ year: 2570, count: 2, href: "year-demo.html" },
	{ year: 2569, count: 22, href: "year-full.html" },
	{ year: 2568, count: 1, href: "year-one.html" },
];
const Y2570 = { label: "ปีงบประมาณ 2570", href: "year-demo.html" };
const FAMILIES = {
	ita: { A: "tile แบบ Quick Access ทับขอบ", B: "การ์ดขาวใหญ่ มี tile ไล่สี" },
	year: { A: "แถวการ์ดขาวต่อ MOIT", B: "การ์ดใบเดียว มีเส้นคั่น" },
	moit: { A: "ใต้ field หน้าตาเดิม", B: "ทับขอบ field", C: "B + eyebrow เป็น pill", D: "B + H1 ไม่เกินขนาด H2", E: "ที่เลือก: B + pill + H1 ไม่เกิน H2" },
};
const cases = [
	{ file: "ita-demo", name: "/ita: demo (1 ปี)", family: "ita", render: itaPage(years3.slice(0, 1)) },
	{ file: "ita-three", name: "/ita: 3 ปี", family: "ita", render: itaPage(years3) },
	{ file: "ita-empty", name: "/ita: ยังไม่มีข้อมูล", family: "ita", render: itaPage([]) },
	{ file: "year-demo", name: "ปี 2570: demo (2 MOIT)", family: "year", render: yearPage(2570, [demo1, demo2]) },
	{ file: "year-one", name: "ปี 2568: 1 MOIT", family: "year", render: yearPage(2568, year2568) },
	{ file: "year-full", name: "ปี 2569: 22 MOIT", family: "year", render: yearPage(2569, year2569) },
	{ file: "moit-demo-1", name: "MOIT 1 demo: 2 ข้อ 7 หลักฐาน (ตัวแรกของปี)", family: "moit", render: moitPage(demo1, [HOME, ITA, Y2570, { label: "MOIT 1" }]) },
	{ file: "moit-demo-2", name: "MOIT 2 demo: 18 ข้อ 41 หลักฐาน (ตัวสุดท้ายของปี)", family: "moit", render: moitPage(demo2, [HOME, ITA, Y2570, { label: "MOIT 2" }]) },
	{ file: "moit-lead-only", name: "MOIT: ไม่มีข้อกำหนด ไม่มี summary (กลางปี)", family: "moit", render: moitPage(leadOnly, [HOME, ITA, { label: "ปีงบประมาณ 2569", href: "year-full.html" }, { label: "MOIT 5" }]) },
	{ file: "moit-long-title", name: "MOIT: ชื่อยาว ไม่มี crumb ปี ไม่มีลิงก์ข้างเคียง", family: "moit", render: moitPage(longTitle, [HOME, ITA, { label: "MOIT 12" }]) },
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
${SHELL.htmlTag}
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PROTOTYPE · ${esc(c.name)}</title><link rel="stylesheet" href="proto.css"></head>
<body class="flex min-h-dvh flex-col bg-bg-page text-body text-text-primary">
${SHELL.header}
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

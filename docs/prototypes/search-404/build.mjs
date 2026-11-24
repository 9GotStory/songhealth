// PROTOTYPE (throwaway), Feature 015: /search and the 404 page in the Bold Modern look, the last
// two public pages. node .tmp/prototypes/search-404/build.mjs  →  *.html, proto.css
//
// Each page is the development runtime's own rendering of /search (GET requests only, the demo
// dataset's content): its header and footer, and its <main> once per variant, switched by
// ?variant= and a floating bar. The 404 page is built on /search's shell, so no request for a
// missing page is made (EmDash's 404 log keeps each one).
//
// The Product Owner picks three things from the screenshots (grill of 2026-11-24, Q1 to Q11):
//
// - the search field's place:
//   A  the form on a white card over the deep field's lower edge, as a filter form; with results,
//      the card also holds the groups and the count;
//   B  the Homepage hero's white pill on the field under the heading; with results, the groups
//      and the count are the white card over the edge; with nothing found, the empty state is;
//   B2 B with the groups and the count on the page's light ground and nothing over the edge
//      (what the grill's list of assumptions said; kept to compare);
// - a result's row: one link over the whole row with the light row tile holding its kind's icon
//   (A, B, T), or the same row without the tile (AN, N);
// - the 404 page: A a list's heading on the field (label "ขออภัย", search-x), the site search and
//   the two links; B the same with a large still "404" on the field in place of the ring.
//
// With a query the lead is left out (Q10). Every word of every state is the page's own (Q1).
// The stylesheet is main's src/styles/global.css compiled by Tailwind over these pages.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const get = async (path) => {
	const res = await fetch(ORIGIN + path);
	if (!res.ok) throw new Error(`${path}: ${res.status}`);
	return res.text();
};
const clean = (html) =>
	html
		.replace(/ data-astro-[a-z-]+="[^"]*"/g, "")
		.replace(/ data-astro-[a-z-]+(?=[ >])/g, "")
		.replace(/(href|src|action|srcset)="\//g, `$1="${ORIGIN}/`)
		.replace(/, \/_/g, `, ${ORIGIN}/_`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const q = (text, group) => `/search?q=${encodeURIComponent(text)}${group ? `&group=${group}` : ""}`;

const iconCache = new Map();
const icon = (name, size = 16, cls = "") => {
	if (!iconCache.has(name)) throw new Error(`icon not loaded: ${name}`);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 ${cls}" aria-hidden="true">${iconCache.get(name)}</svg>`;
};
for (const name of [
	"arrow-right", "chevron-right", "search", "search-x", "message-square", "heart", "file-text", "users", "hospital",
	"heart-pulse", "file-chart-column", "folder-open", "shield-check", "info",
]) {
	const source = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(source.match(/iconData: LucideIconData = (\{.*\});/)[1]);
	iconCache.set(name, node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join(""));
}

// ---- what the runtime's /search rendered -----------------------------------------------------
const mainOf = (src) => clean(src.match(/<main[^>]*>(.*)<\/main>/s)[1]);
function parse(src) {
	const main = mainOf(src);
	const results = [...main.matchAll(/<article[^>]*>(.*?)<\/article>/gs)].map(([, inner]) => {
		const facts = inner.match(/^<p class="flex flex-wrap[^"]*">(.*?)<\/p>/s)[1];
		const [, href, title] = inner.match(/<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h2>/s);
		let rest = inner.slice(inner.indexOf("</h2>") + 5);
		const snippet = rest.match(/^<p class="wrap-anywhere text-text-secondary[^"]*">(.*?)<\/p>/s);
		if (snippet) rest = rest.slice(snippet[0].length);
		return { facts, href, title, snippet: snippet?.[1] ?? "", status: rest };
	});
	return {
		main,
		results,
		groups: main.match(/<nav aria-label="กลุ่มผลการค้นหา">.*?<\/nav>/s)?.[0] ?? "",
		count: main.match(/<p class="text-label text-text-secondary">(พบ [^<]*)<\/p>/)?.[1] ?? "",
		pager: main.match(/<nav aria-label="การแบ่งหน้า">.*?<\/nav>/s)?.[0] ?? "",
		empty: main.match(/<div class="flex flex-col items-center gap-4 rounded-24 bg-surface-base[^"]*">.*?<\/ul><\/div>/s)?.[0] ?? "",
	};
}

// ---- the field, the heading, the two search fields ----------------------------------------------
const LEAD = "ค้นหาข่าวสาร บริการประชาชน ข้อมูลสุขภาพ หน่วยบริการ เอกสาร และข้อมูลของสำนักงานสาธารณสุขอำเภอสองได้จากที่เดียว";
const PLACEHOLDER = "ค้นหาบริการ ข่าวสาร หน่วยบริการ หรือเอกสาร…";
/** DeepField kind="list", as /documents renders it; `ring`: the large ring from `lg`. */
const deepField = (inner, ring = true) =>
	`<div data-testid="deep-field" class="deep-field focus-ring-on-dark relative overflow-x-clip rounded-b-24 text-surface-base sm:rounded-b-32 sm:[--deep-field-glow:28%_12rem_at_100%_0%]"><div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-clip rounded-b-[inherit]">${
		ring ? '<span class="absolute rounded-pill top-15 -right-42.5 size-130 border-[1.5px] border-surface-base/18 max-lg:hidden"></span>' : ""
	}</div>${inner}</div>`;
/** SectionHeading level 1 on the field, as ListHeading renders it. */
const heading = (iconName, label, title) =>
	`<div class="hero-enter flex min-w-0 items-center gap-3.5 sm:gap-5"><span aria-hidden="true" class="flex size-13 shrink-0 items-center justify-center rounded-16 bg-accent-warm text-brand-dark sm:size-18 sm:rounded-22">${icon(iconName, 24)}</span><div class="min-w-0"><p class="mb-1.5 text-label font-semibold tracking-[0.02em] text-surface-base before:mr-2.5 before:opacity-55 before:content-['/'] after:ml-2.5 after:opacity-55 after:content-['/']">${label}</p><h1 class="section-title wrap-anywhere text-surface-base">${title}</h1></div></div>`;
const CRUMBS = `<nav aria-label="เส้นทางนำทาง"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-surface-base/75"><li class="flex min-w-0 items-center gap-2"><a class="underline underline-offset-4 text-surface-base" href="${ORIGIN}/">หน้าแรก</a></li><li class="flex min-w-0 items-center gap-2">${icon("chevron-right")}<span aria-current="page" class="wrap-anywhere max-sm:truncate text-surface-base">ค้นหา</span></li></ol></nav>`;
const SEARCH_HEADING = heading("search", "ค้นหา", "ค้นหาข้อมูล");
const lead = (text) => `<p class="hero-enter max-w-prose text-body-large [--hero-enter-delay:0.1s]">${text}</p>`;

/** A: the form inside the white card, a labelled field with the button beside it. */
const formA = (value) =>
	`<form role="search" method="get" action="${ORIGIN}/search" aria-label="ค้นหาในเว็บไซต์" class="flex flex-col gap-1.5"><label class="text-label" for="search-query-a">คำค้นหา</label><div class="flex items-center gap-3"><input id="search-query-a" name="q" type="search" value="${esc(value)}" maxlength="100" placeholder="${PLACEHOLDER}" class="min-h-12 w-full min-w-0 flex-1 rounded-14 border border-border-input bg-surface-base px-4 text-body placeholder:text-text-secondary"><button type="submit" class="inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-pill bg-brand-primary px-5 text-label text-surface-base hover:bg-brand-dark sm:px-6">${icon("search")}ค้นหา</button></div></form>`;
/** B and the 404: the Homepage hero's pill, as HomeHero renders it; up to 640 px from `lg`. */
const pill = (id, value, placeholder) =>
	`<form role="search" method="get" action="${ORIGIN}/search" aria-label="ค้นหาในเว็บไซต์" class="hero-enter focus-ring-on-light flex h-15 w-full max-w-135 items-center gap-3 rounded-pill bg-surface-base pr-2 pl-5 text-text-secondary shadow-deep [--hero-enter-delay:0.2s] sm:h-17 sm:pl-6 lg:max-w-160">${icon("search", 20)}<label class="sr-only" for="${id}">ค้นหาในเว็บไซต์</label><input id="${id}" name="q" type="search" value="${esc(value)}" maxlength="100" placeholder="${placeholder}" class="min-h-11 w-full min-w-0 flex-1 rounded-pill bg-transparent text-body text-text-primary placeholder:text-text-secondary sm:text-body-large"><button type="submit" class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill bg-accent-warm text-brand-dark motion-safe:transition-transform motion-safe:hover:scale-108 sm:size-13"><span class="sr-only">ค้นหา</span>${icon("arrow-right", 20)}</button></form>`;

// ---- a result's row ---------------------------------------------------------------------------
const KIND_ICON = [
	["/news/", "message-square"], ["/activities/", "heart"], ["/announcements/", "file-text"], ["/services/", "users"],
	["/health-services/", "hospital"], ["/health/content/", "heart-pulse"], ["/health/reports/", "file-chart-column"],
	["/documents/", "folder-open"], ["/ita/", "shield-check"],
];
/** A kind's list heading icon; a Basic Page, which has none, takes `info`. */
const kindIcon = (href) => KIND_ICON.find(([prefix]) => href.replace(ORIGIN, "").startsWith(prefix))?.[1] ?? "info";
let uid = 0;
/** HealthReportRow's row: one link over the whole row, the light tile, the arrow from `sm`. */
function row(result, tile, first) {
	const id = `result-${++uid}`;
	return `<li class="scroll-reveal"${first ? " data-first-result" : ""}><article class="group"><div class="relative flex items-center gap-3.5 rounded-22 bg-surface-base shadow-card motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-2.5 motion-safe:group-hover:shadow-deep sm:gap-5.5 sm:py-4.5 sm:pr-5.5 ${tile ? "p-3 sm:pl-4.5" : "px-4 py-3.5 sm:pl-6"}">${
		tile
			? `<p aria-hidden="true" class="flex size-17 shrink-0 flex-col items-center justify-center rounded-14 bg-surface-soft text-brand-primary sm:size-23 sm:rounded-18">${icon(kindIcon(result.href), 24)}</p>`
			: ""
	}<div class="flex min-w-0 flex-1 flex-col gap-1"><p class="flex flex-wrap gap-x-2 text-small text-text-secondary">${result.facts}</p><h2 id="${id}" class="text-body font-semibold wrap-anywhere group-hover:text-brand-primary sm:text-body-large">${result.title}</h2>${
		result.snippet
			? `<p class="text-label font-normal wrap-anywhere text-text-secondary sm:text-body [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-text-primary">${result.snippet}</p>`
			: ""
	}${result.status.replace(/^<p>/, '<p class="mt-0.5">')}</div><span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-soft text-brand-primary group-hover:bg-accent-warm group-hover:text-brand-dark motion-safe:transition-colors max-sm:hidden">${icon("arrow-right", 20)}</span><a href="${result.href}" aria-labelledby="${id}" class="focus-ring-banded absolute inset-0 rounded-22 after:absolute after:inset-y-0 after:right-full after:hidden after:w-2.5 motion-safe:group-hover:after:block"></a></div></article></li>`;
}
const rows = (results, tile) => `<ul class="flex flex-col gap-3.5">${results.map((r, i) => row(r, tile, i === 0)).join("")}</ul>`;

// ---- /search in a variant -------------------------------------------------------------------
const CARD = "rounded-24 bg-surface-base p-5 shadow-card";
const BODY = "page-container relative -mt-16 flex flex-col gap-8 pb-16 sm:-mt-22 lg:pb-20";
const field = (overEdge, inner) =>
	deepField(`<div class="page-container relative flex flex-col gap-6 pt-6 sm:gap-8 ${overEdge ? "pb-24 sm:pb-32" : "pb-10 sm:pb-12"}">${CRUMBS}${inner}</div>`);
/** `state`: "start", "found" or "nothing"; `page`: what parse() read; `value`: the query. */
const search = (state, value) => (page, variant) => {
	if (variant === "now") return page.main.replace("<article", "<article data-first-result");
	const tile = !variant.endsWith("N");
	const head = `<div class="flex min-w-0 flex-col gap-4">${SEARCH_HEADING}${state === "start" ? lead(LEAD) : ""}</div>`;
	const narrow = `${page.groups}<p class="text-label text-text-secondary">${page.count}</p>`;
	const list = state === "found" ? rows(page.results, tile) + page.pager : "";
	if (variant[0] === "A")
		return (
			field(true, head) +
			`<div class="${BODY}"><div class="flex flex-col gap-5 ${CARD}">${formA(value)}${
				state === "found" ? `<div class="flex flex-col gap-4 border-t border-border-default pt-5">${narrow}</div>` : ""
			}</div>${state === "nothing" ? page.empty : ""}${list}</div>`
		);
	const onField = head + pill("search-query-b", value, PLACEHOLDER);
	if (state === "start") return field(false, onField) + '<div class="pb-16 lg:pb-20"></div>';
	if (state === "nothing") return field(true, onField) + `<div class="${BODY}">${page.empty}</div>`;
	if (variant === "B2")
		return field(false, onField) + `<div class="page-container flex flex-col gap-6 pt-8 pb-16 lg:pt-10 lg:pb-20">${narrow}${list}</div>`;
	return field(true, onField) + `<div class="${BODY}"><div class="flex flex-col gap-4 ${CARD}">${narrow}</div>${list}</div>`;
};

// ---- the 404 page ------------------------------------------------------------------------------
const NOT_FOUND = "ไม่พบหน้าที่คุณต้องการ";
const NOT_FOUND_TEXT = "ที่อยู่นี้อาจพิมพ์ไม่ถูกต้อง หรือหน้านี้อาจถูกย้ายหรือนำออกแล้ว";
const ACTION = "inline-flex min-h-11 items-center rounded-pill px-5 text-label";
const SECONDARY = `${ACTION} border border-border-input bg-surface-base text-brand-primary hover:bg-surface-soft`;
const FIELD_LINK = "inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-surface-base underline underline-offset-4";
const notFound = (_page, variant) => {
	// src/pages/404.astro as it is in main, with ActionLink's classes.
	if (variant === "now")
		return `<div class="page-container py-16 lg:py-20"><h1 class="text-h3 text-brand-dark sm:text-h2 lg:text-h1">${NOT_FOUND}</h1><p class="mt-4 max-w-prose text-body-large text-text-secondary">${NOT_FOUND_TEXT}</p><ul class="mt-8 flex flex-wrap gap-3"><li><a class="${ACTION} bg-brand-primary text-surface-base hover:bg-brand-dark" href="${ORIGIN}/">กลับไปหน้าแรก</a></li><li><a class="${SECONDARY}" href="${ORIGIN}/search">ค้นหาข้อมูล</a></li><li><a class="${SECONDARY}" href="${ORIGIN}/contact">ติดต่อเรา</a></li></ul></div>`;
	const numeral =
		variant === "B"
			? '<p aria-hidden="true" class="pointer-events-none text-[5.5rem]/none font-bold tracking-[-0.04em] text-surface-base/14 select-none sm:text-[7.5rem]/none lg:absolute lg:top-1/2 lg:right-8 lg:-translate-y-1/2 lg:text-[15rem]/none xl:text-[19rem]/none">404</p>'
			: "";
	return (
		deepField(
			`<div class="page-container relative flex flex-col gap-6 pt-10 pb-12 sm:gap-8 sm:pt-14 sm:pb-16 lg:pt-18 lg:pb-20">${numeral}<div class="flex min-w-0 flex-col gap-4">${heading("search-x", "ขออภัย", NOT_FOUND)}${lead(NOT_FOUND_TEXT)}</div>${pill(`notfound-search-${variant.toLowerCase()}`, "", "คุณกำลังมองหาอะไร?")}<ul class="flex flex-wrap gap-x-6 gap-y-1"><li><a class="${FIELD_LINK}" href="${ORIGIN}/">กลับไปหน้าแรก${icon("arrow-right")}</a></li><li><a class="${FIELD_LINK}" href="${ORIGIN}/contact">ติดต่อเรา${icon("arrow-right")}</a></li></ul></div>`,
			variant !== "B",
		) + '<div class="pb-16 lg:pb-20"></div>'
	);
};

// ---- the cases ---------------------------------------------------------------------------------
const FOUND = "สุขภาพ";
const S = { now: "ปัจจุบัน", A: "A ช่องค้นหาบนการ์ดทับขอบ", B: "B ช่องค้นหาแบบหน้าแรกบน field" };
const cases = [
	{ file: "search-start", path: "/search", name: "/search: สถานะเริ่มต้น", names: S, render: search("start", "") },
	{
		file: "search-found",
		path: q(FOUND),
		name: `/search: พบผล (“${FOUND}”)`,
		names: { ...S, B2: "B2 กลุ่มบนพื้นอ่อน ไม่มีอะไรทับขอบ", AN: "A แถวไม่มี tile" },
		render: search("found", FOUND),
	},
	{ file: "search-nothing", path: q("zzzzqq"), name: "/search: ไม่พบ", names: S, render: search("nothing", "zzzzqq") },
	{ file: "search-kinds", path: null, name: "แถวผลการค้นหา: ทุกชนิด", names: { T: "T มี tile ไอคอนตามชนิด", N: "N ไม่มี tile" }, render: null },
	{ file: "notfound", path: "/search", name: "หน้า 404", names: { now: "ปัจจุบัน", A: "A หัวแบบ list บน field", B: "B มีเลข 404 บน field" }, render: notFound },
];

// One or two results of each kind, with every status the demo dataset shows, for the close-up.
const ALL = "ตัวอย่าง";
const kinds = [];
for (const group of ["news", "services", "health", "health-services", "documents", "about", "ita"]) {
	const { results } = parse(await get(q(ALL, group)));
	const seen = new Set();
	for (const r of results) {
		const key = `${r.facts.replace(/<time.*?<\/time>/s, "").replace(/<[^>]+>/g, "").replace(/\d+/g, "n")}|${r.status.replace(/<[^>]+>/g, "")}`;
		if (seen.has(key)) continue;
		seen.add(key);
		kinds.push(r);
	}
}
const kindsCase = cases.find((c) => c.file === "search-kinds");
kindsCase.path = q(ALL);
kindsCase.render = (page, variant) =>
	field(true, `<div class="flex min-w-0 flex-col gap-4">${SEARCH_HEADING}</div>${pill(`kinds-${variant}`, ALL, PLACEHOLDER)}`) +
	`<div class="${BODY}"><div class="flex flex-col gap-4 ${CARD}">${page.groups}<p class="text-label text-text-secondary">${page.count}</p></div>${rows(kinds, variant === "T")}</div>`;

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
	const step = (by) => { current = keys[(keys.indexOf(current) + by + keys.length) % keys.length]; show(); };
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
	const src = await get(c.path);
	const page = parse(src);
	const header = clean(src.match(/<header.*?<\/header>/s)[0]);
	const footer = clean(src.match(/<footer.*?<\/footer>/s)[0]);
	const keys = Object.keys(c.names);
	const html = `<!doctype html>
${src.match(/<html[^>]*>/)[0]}
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>PROTOTYPE · ${esc(c.name)}</title><link rel="stylesheet" href="proto.css"></head>
<body class="flex min-h-dvh flex-col bg-bg-page text-body text-text-primary">
${header}
<main id="main" tabindex="-1" class="flex-1">
${keys.map((k, i) => `<div data-variant="${k}"${i ? " hidden" : ""}>${c.render(page, k)}</div>`).join("\n")}
</main>
${footer}
${bar(c.names)}
</body></html>`;
	await writeFile(new URL(`${c.file}.html`, here), html);
}

const source = execFileSync("git", ["show", "origin/main:src/styles/global.css"], { encoding: "utf8" });
const globalCss = source.replace('@import "tailwindcss" source("../");', '@import "tailwindcss" source(none);');
if (globalCss === source) throw new Error("global.css: the Tailwind import line changed");
const compiler = await compile(globalCss, { base: here.pathname, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: here.pathname, pattern: "*.html", negated: false }] });
await writeFile(new URL("proto.css", here), compiler.build(scanner.scan()) + PROTO_CSS);
console.log(`${cases.length} pages:\n${cases.map((c) => `  ${c.file}.html  ${c.name}  [${Object.keys(c.names).join(" ")}]`).join("\n")}`);
console.log(`search-kinds: ${kinds.length} rows`);

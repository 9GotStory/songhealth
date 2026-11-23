// PROTOTYPE (throwaway), Feature 014 (#412): the light row tile everywhere it shows, and /health's
// and /about's cards as /services' cards. node .tmp/prototypes/light-tile-cards/build.mjs
//
// Each page is the development runtime's own rendering of a public page (GET requests only, the
// demo dataset's content), its <main> copied once per variant and switched by ?variant= and a
// floating bar. A variant rewrites only the markup it is about:
//
// - the row tile (every 68/92 px tile on the gradient: FileTile, ItaMoitRow, HealthReportRow,
//   AnnouncementRow's open date tile, HealthServiceMapRow's hospital):
//   A flat surface-soft, icon/number/day brand-primary, second line brand-dark;
//   B a light gradient surface-soft → plain-visual-to, A's lines;
//   C A's ground, the second line a brand-dark pill on accent-warm;
// - a closed Announcement's tile: "1" white with a border-default edge and text-secondary lines
//   (with A, B, C), "2" today's status-closed (A2, B2, C2), on /announcements only;
// - /health's and /about's tiles become HomeServiceCard kind="list" (copied from /services'
//   rendering), with the destination's heading icon and its lead as the summary (S) or without (N);
//   their related Documents' tiles take A.
//
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
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// ---- the row tile ----------------------------------------------------------------------------
const TILE = /<p([^>]*?)class="([^"]*\bsize-17\b[^"]*)"([^>]*)>(.*?)<\/p>/gs;
const GROUND = {
	A: "bg-surface-soft text-brand-primary",
	B: "bg-linear-140 from-surface-soft to-plain-visual-to text-brand-primary",
	C: "bg-surface-soft text-brand-primary",
};
const tiles = (html, variant) => {
	if (variant === "now") return html;
	const [ground, closedKeep] = [variant[0], variant.endsWith("2")];
	return html.replace(TILE, (all, pre, cls, post, inner) => {
		if (cls.includes("bg-status-closed")) {
			if (closedKeep) return all;
			cls = cls.replace("bg-status-closed text-text-primary", "border border-border-default bg-surface-base text-text-secondary");
			inner = inner.replace(/text-text-primary/g, "text-text-secondary");
			return `<p${pre}class="${cls}"${post}>${inner}</p>`;
		}
		if (!cls.includes("from-brand-primary")) return all;
		cls = cls
			.replace(/bg-linear-140 from-brand-primary to-brand-dark text-(surface-base|accent-warm)/, GROUND[ground]);
		inner = inner.replace(/class="([^"]*)\btext-accent-warm\b([^"]*)"/g, (_, a, b) =>
			ground === "C"
				? `class="${a}rounded-pill bg-accent-warm px-2 text-brand-dark${b}"`
				: `class="${a}text-brand-dark${b}"`,
		);
		return `<p${pre}class="${cls}"${post}>${inner}</p>`;
	});
};

// ---- the cards ---------------------------------------------------------------------------------
const icon = async (name) => {
	const src = await readFile(`node_modules/@lucide/astro/src/icons/${name}.ts`, "utf8");
	const { node } = JSON.parse(src.match(/const iconData: LucideIconData = (\{.*\});/)[1]);
	const body = node
		.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}></${tag}>`)
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name} shrink-0" aria-hidden="true">${body}</svg>`;
};
const servicesHtml = await get("/services");
const CARD = servicesHtml.match(/<article class="group focus-ring-on-light h-full">.*?<\/article>/s)[0];
const card = (d, withSummary) => {
	let html = CARD.replace(/<svg.*?<\/svg>/s, d.svg)
		.replace(/(<h2[^>]*>).*?(<\/h2>)/s, `$1${esc(d.label)}$2`)
		.replace(/href="[^"]*"/, `href="${ORIGIN}${d.href}"`);
	html = html.replace(/<p class="mt-1 [^"]*">.*?<\/p>/s, "");
	if (withSummary && d.summary)
		html = html.replace(
			/<\/h2>/,
			`</h2><p class="mt-1 line-clamp-3 text-label font-normal text-text-secondary-on-soft group-hover:text-surface-base max-sm:hidden">${esc(d.summary)}</p>`,
		);
	return html;
};
const DEST = {
	health: [
		["ความรู้สุขภาพ", "/health/content", "heart-pulse", "ความรู้ด้านสุขภาพสำหรับประชาชนในอำเภอสอง เลือกประเด็นสุขภาพที่สนใจได้"],
		["รายงานสุขภาพ", "/health/reports", "file-chart-column", "รายงานด้านสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย พร้อมเอกสารรายงานฉบับเต็ม"],
	],
	about: [
		["โครงสร้างองค์กร", "/about/organization", "network", "การแบ่งส่วนงานภายในของสำนักงานสาธารณสุขอำเภอสอง"],
		["ผู้บริหาร", "/about/leadership", "user-round", "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง"],
		["บุคลากร", "/about/personnel", "users-round", "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน"],
		["นโยบาย", "/about/policies", "scroll-text", "เอกสารนโยบายของสำนักงานสาธารณสุขอำเภอสอง"],
		["แผนงาน", "/about/plans", "clipboard-list", "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง"],
		["ผลการดำเนินงาน", "/about/results", "chart-column", "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง"],
	],
};
for (const list of Object.values(DEST))
	for (const [i, [label, href, name, summary]] of list.entries()) list[i] = { label, href, summary, svg: await icon(name) };
const GRID = { health: "grid gap-3 sm:grid-cols-2 sm:gap-5", about: "grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3" };
const cards = (kind) => (html, variant) => {
	if (variant === "now") return html;
	const items = DEST[kind].map((d) => `<li class="scroll-reveal">${card(d, variant === "S")}</li>`).join("");
	return tiles(html.replace(/<ul class="grid grid-cols-2[^"]*">.*?<\/ul>/s, `<ul class="${GRID[kind]}">${items}</ul>`), "A");
};

// ---- the cases ---------------------------------------------------------------------------------
const T = { now: "ปัจจุบัน (gradient)", A: "A พื้นอ่อนเรียบ", B: "B ไล่สีอ่อน", C: "C บรรทัดรองเป็น pill" };
const T2 = { ...T, A2: "A + ปิดแล้วคงสีเทา", B2: "B + ปิดแล้วคงสีเทา", C2: "C + ปิดแล้วคงสีเทา" };
const K = { now: "ปัจจุบัน (Quick Link)", S: "การ์ดมีคำอธิบาย (tile เอกสาร A)", N: "การ์ดไม่มีคำอธิบาย (tile เอกสาร A)" };
const cases = [
	{ file: "home", path: "/", name: "หน้าแรก: ประกาศ", names: T, render: tiles },
	{ file: "announcements", path: "/announcements", name: "/announcements: เปิด + ปิดแล้ว", names: T2, render: tiles },
	{ file: "announcement-docs", path: "/announcements/demo-announcement-vhv-recruitment", name: "ประกาศ: เอกสารที่เกี่ยวข้อง", names: T, render: tiles },
	{ file: "documents", path: "/documents", name: "/documents", names: T, render: tiles },
	{ file: "document", path: "/documents/demo-document-plan-2570", name: "หน้า Document", names: T, render: tiles },
	{ file: "about-policies", path: "/about/policies", name: "/about/policies", names: T, render: tiles },
	{ file: "health-reports", path: "/health/reports", name: "/health/reports", names: T, render: tiles },
	{ file: "health-report", path: "/health/reports/demo-report-dengue-q4", name: "หน้า Health Report", names: T, render: tiles },
	{ file: "ita-year", path: "/ita/2570", name: "/ita/2570", names: T, render: tiles },
	{ file: "health-services", path: "/health-services", name: "/health-services", names: T, render: tiles },
	{ file: "service", path: "/services/demo-service-flu-vaccine", name: "บริการ: หน่วยบริการ", names: T, render: tiles },
	{ file: "health", path: "/health", name: "/health: การ์ด", names: K, render: cards("health") },
	{ file: "about", path: "/about", name: "/about: การ์ด + เอกสาร", names: K, render: cards("about") },
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
	const step = (by) => { current = keys[(keys.indexOf(current) + by + keys.length) % keys.length]; show(); };
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
	const src = await get(c.path);
	const main = clean(src.match(/<main[^>]*>(.*)<\/main>/s)[1]);
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
${keys.map((k, i) => `<div data-variant="${k}"${i ? " hidden" : ""}>${c.render(main, k)}</div>`).join("\n")}
</main>
${footer}
${bar(c.names)}
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
console.log(`${cases.length} pages:\n${cases.map((c) => `  ${c.file}.html  ${c.name}  [${Object.keys(c.names).join(" ")}]`).join("\n")}`);

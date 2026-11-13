// PROTOTYPE (throwaway): three structurally different Homepage redesigns, switchable with
// ?variant=A|B|C and the floating bar (← → keys). Product Owner, 2026-11-10: "รอบนี้ออกแบบใหม่เลย".
// Real content from the dev runtime (data.json, extract.mjs); images load from 127.0.0.1:4324.
// Every variant keeps the section order of 04-homepage §3 in the DOM.
// node .tmp/prototypes/home-redesign/build.mjs   →   .tmp/prototypes/home-redesign/home-redesign.html
import { readFile, writeFile } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const d = JSON.parse(await readFile(new URL("data.json", here), "utf8"));
const O = "http://127.0.0.1:4324";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const demo = (s) => String(s ?? "").replace(/^\[ตัวอย่าง\]\s*/, "");
const href = (h) => O + h;

// Lucide paths (ISC), stroke icons
const I = {
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	chev: '<path d="m9 18 6-6-6-6"/>',
	arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
	out: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
	phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
	clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
	pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
	msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
	bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
	pulse: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
	file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
	mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
	menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
	heart: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
	plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
	left: '<path d="m15 18-6-6 6-6"/>',
};
const ic = (n, s = 20, cls = "") => `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const serviceIcon = { complaint: "msg", feedback: "bulb", "health-problem": "pulse", "information-request": "file", vhv: "users", "general-inquiry": "help" };
const sIcon = (s) => serviceIcon[Object.keys(serviceIcon).find((k) => s.href.endsWith(k))] ?? "file";
const quickIcon = (q) => (q.href.includes("documents") ? "file" : q.href.includes("ita") ? "help" : "heart");

// ----- data, as the page would read it -----
const F = d.home.featured;
const featuredNews = d.news.find((n) => n.href === F.href);
const news = d.news.filter((n) => n.href !== F.href).slice(0, 4);
const anns = d.announcements.slice(0, 4).map((a) => ({ ...a, cat: a.meta[0]?.split("•")[0] }));
const health = d.healthList.slice(0, 4).map((h) => ({ ...h, topic: h.meta[0]?.split("•")[0], summary: h.meta[1] }));
const acts = d.activities.slice(0, 4);
const services = d.home.services;
const contact = Object.fromEntries(d.home.contact.map((c) => [c.k, c.v.replace("เปิดแผนที่(เปิดในแท็บใหม่)", "")]));
const SITE = "สำนักงานสาธารณสุขอำเภอสอง";
const areas = d.home.areas;

// ----- shared bits (header, footer, small atoms) -----
const header = `
<header class="hd"><div class="wrap hd-in">
  <a class="brand" href="${O}/"><span class="logo">${ic("plus", 22)}</span><span><b>${SITE}</b><small>จังหวัดแพร่</small></span></a>
  <nav class="hd-nav" aria-label="เมนูหลัก">${d.home.nav.slice(0, 7).map((n, i) => `<a ${i === 0 ? 'aria-current="page"' : ""} href="${href(n.href)}">${esc(n.label)}</a>`).join("")}</nav>
  <div class="hd-act"><a class="icbtn" href="${O}/search" aria-label="ค้นหา">${ic("search", 20)}</a><a class="pill-o" href="${O}/contact">ติดต่อเรา</a><button class="icbtn menu" aria-label="เปิดเมนู">${ic("menu", 22)}</button></div>
</div></header>`;
const footer = `
<footer class="ft"><div class="wrap ft-in">
  <p><b>${SITE}</b> · จังหวัดแพร่</p>
  <nav aria-label="ช่องทางทางการ"><a href="#">Facebook ${ic("out", 14)}</a><a href="#">LINE ${ic("out", 14)}</a><a href="#">YouTube ${ic("out", 14)}</a><a href="#">นโยบายความเป็นส่วนตัว</a><a href="#">การเข้าถึงเว็บไซต์</a></nav>
</div></footer>`;
const sh = (id, title, link, more = "ดูทั้งหมด") => `<div class="sh"><h2 id="${id}">${title}</h2>${link ? `<a class="more" href="${href(link)}">${more} ${ic("arrow", 16)}</a>` : ""}</div>`;
const searchForm = (cls = "") => `<form class="search ${cls}" action="${O}/search" role="search"><label class="sr" for="q-${cls}">ค้นหา</label>${ic("search", 20, "s-ic")}<input id="q-${cls}" name="q" type="search" placeholder="ค้นหาบริการ ข่าวสาร หน่วยบริการ หรือเอกสาร"><button>ค้นหา</button></form>`;
const discoveryForm = (cls = "") => `<form class="disc ${cls}" action="${O}/health-services">
  <label><span>พื้นที่รับผิดชอบ</span><select name="area"><option>ทุกพื้นที่</option>${areas.map((a) => `<option>${esc(a)}</option>`).join("")}</select></label>
  <label><span>ชื่อหน่วยบริการ</span><input name="name" type="search" placeholder="เช่น รพ.สต.บ้านกลาง"></label>
  <button>${ic("search", 18)} ค้นหาหน่วยบริการ</button></form>`;
const areaChips = `<div class="chips">${areas.map((a) => `<a href="${O}/health-services">${esc(a)}</a>`).join("")}</div>`;
const img = (src, alt = "", cls = "") => `<img class="${cls}" src="img/${String(src).split("/").pop()}" alt="${esc(alt)}" loading="eager">`;
const annRow = (a) => `<li><a href="${href(a.href)}"><span class="meta"><span class="tag">${esc(a.cat)}</span>${esc(a.date)}</span><span class="t2">${esc(a.title)}</span></a></li>`;
const newsRow = (n) => `<li><a class="row" href="${href(n.href)}">${img(n.img, "", "th")}<span><span class="meta">${esc(n.date)}</span><span class="t2">${esc(n.title)}</span></span></a></li>`;
const contactList = `<dl class="cl">
  <div><dt>${ic("pin", 18)} ที่ตั้ง</dt><dd>${esc(demo(contact["ที่ตั้ง"]))}<a class="pill-o sm" href="#">เปิดแผนที่ ${ic("out", 14)}</a></dd></div>
  <div><dt>${ic("phone", 18)} โทรศัพท์</dt><dd><a class="tel" href="tel:054000000">${esc(contact["โทรศัพท์"])}</a></dd></div>
  <div><dt>${ic("clock", 18)} เวลาทำการ</dt><dd>${esc(contact["เวลาทำการ"])}</dd></div></dl>`;

// ===== Variant A: editorial sections =====
const A = `
<main class="vA">
  <h1 class="sr">${SITE}</h1>
  <section class="wrap a-hero" aria-labelledby="a-feat">
    <div class="a-hero-card">
      <a class="a-hero-media" href="${href(F.href)}">${img(F.img, "", "")}</a>
      <div class="a-hero-text">
        <p class="chip">${ic("mega", 16)} เรื่องเด่น · ${esc(featuredNews?.date)}</p>
        <h2 id="a-feat" class="a-title"><a href="${href(F.href)}">${esc(F.title)}</a></h2>
        <a class="more" href="${href(F.href)}">อ่านเรื่องเด่น ${ic("arrow", 16)}</a>
        <div class="a-search"><h2 class="lbl" id="a-q">คุณกำลังมองหาอะไร?</h2>${searchForm("big")}</div>
      </div>
    </div>
  </section>

  <section class="wrap sec" aria-labelledby="a-svc">
    ${sh("a-svc", "บริการประชาชน", "/services", "ดูบริการทั้งหมด")}
    <ul class="a-svc">${services.map((s) => `<li><a href="${href(s.href)}"><span class="ib">${ic(sIcon(s), 22)}</span><span><span class="t1">${esc(demo(s.title))}</span><span class="sum">${esc(s.summary)}</span></span>${ic("chev", 18, "chev")}</a></li>`).join("")}</ul>
  </section>

  <section class="wrap sec" aria-labelledby="a-news">
    ${sh("a-news", "ข่าวสารและประกาศ", "/news", "ดูข่าวทั้งหมด")}
    <div class="a-news">
      <a class="lead" href="${href(news[0].href)}">${img(news[0].img, "", "ph")}<span class="meta">ข่าวล่าสุด · ${esc(news[0].date)}</span><span class="t-lead">${esc(news[0].title)}</span></a>
      <ul class="list">${news.slice(1).map(newsRow).join("")}</ul>
      <div class="ann"><div class="ann-h"><h3>${ic("mega", 18)} ประกาศ</h3><a class="more" href="${O}/announcements">ทั้งหมด ${ic("arrow", 16)}</a></div><ul>${anns.map(annRow).join("")}</ul></div>
    </div>
  </section>

  <div class="wrap a-pair">
    <section class="sec" aria-labelledby="a-health">
      ${sh("a-health", "ความรู้สุขภาพ", "/health/content")}
      <ul class="a-health">${health.map((h) => `<li><a href="${href(h.href)}">${img(h.img, "", "th")}<span><span class="topic">${esc(h.topic)}</span><span class="t2">${esc(demo(h.title))}</span><span class="sum">${esc(h.summary)}</span></span></a></li>`).join("")}</ul>
    </section>
    <section class="sec a-disc" aria-labelledby="a-disc">
      <div class="dark-card">
        <p class="eyebrow">หน่วยบริการสุขภาพ</p>
        <h2 id="a-disc">ค้นหาหน่วยบริการใกล้บ้าน</h2>
        ${discoveryForm()}
        <p class="sub">หรือเลือกตามตำบล</p>${areaChips}
      </div>
    </section>
  </div>

  <section class="wrap sec" aria-labelledby="a-act">
    ${sh("a-act", "กิจกรรมในชุมชน", "/activities", "ดูกิจกรรมทั้งหมด")}
    <ul class="a-act">${acts.map((a) => `<li><a href="${href(a.href)}">${img(a.img, "", "ph")}<span class="meta">${ic("clock", 14)} ${esc(a.date)}</span><span class="t2">${esc(a.title)}</span></a></li>`).join("")}</ul>
  </section>

  <div class="a-bottom"><div class="wrap a-bottom-in">
    <section aria-labelledby="a-quick"><h2 id="a-quick" class="h-sm">ข้อมูลและเอกสารสำคัญ</h2>
      <ul class="qlist">${d.home.quick.map((q) => `<li><a href="${href(q.href)}"><span class="ib sm">${ic(quickIcon(q), 18)}</span>${esc(q.label)}${ic("chev", 18, "chev")}</a></li>`).join("")}</ul></section>
    <section aria-labelledby="a-contact"><h2 id="a-contact" class="h-sm">ติดต่อ${SITE}</h2>${contactList}<a class="more" href="${O}/contact">ดูข้อมูลติดต่อทั้งหมด ${ic("arrow", 16)}</a></section>
  </div></div>
</main>`;

// ===== Variant B: bento tiles =====
const B = `
<main class="vB"><div class="wrap bento">
  <h1 class="sr">${SITE}</h1>
  <section class="tile b-feat" aria-labelledby="b-feat"><a href="${href(F.href)}">${img(F.img)}<span class="ov"><span class="chip on-dark">${ic("mega", 16)} เรื่องเด่น · ${esc(featuredNews?.date)}</span><h2 id="b-feat">${esc(F.title)}</h2><span class="more on-dark">อ่านต่อ ${ic("arrow", 16)}</span></span></a></section>
  <section class="tile b-search" aria-labelledby="b-q"><h2 id="b-q" class="h-sm">คุณกำลังมองหาอะไร?</h2>${searchForm("b")}</section>
  <section class="tile b-svc" aria-labelledby="b-svc">${sh("b-svc", "บริการประชาชน", "/services")}
    <ul>${services.map((s) => `<li><a href="${href(s.href)}"><span class="ib">${ic(sIcon(s), 22)}</span><span class="t2">${esc(demo(s.title))}</span></a></li>`).join("")}</ul></section>

  <section class="tile b-news" aria-labelledby="b-news">${sh("b-news", "ข่าวสาร", "/news")}
    <div class="b-news-in"><a class="lead" href="${href(news[0].href)}">${img(news[0].img, "", "ph")}<span class="meta">${esc(news[0].date)}</span><span class="t-lead">${esc(news[0].title)}</span></a>
    <ul class="list">${news.slice(1).map(newsRow).join("")}</ul></div></section>
  <section class="tile b-ann" aria-labelledby="b-ann">${sh("b-ann", "ประกาศ", "/announcements")}<ul class="annl">${anns.map(annRow).join("")}</ul></section>

  <section class="tile b-health" aria-labelledby="b-health">${sh("b-health", "ความรู้สุขภาพ", "/health/content")}
    <ul>${health.map((h) => `<li><a href="${href(h.href)}">${img(h.img, "", "ph")}<span class="topic">${esc(h.topic)}</span><span class="t2">${esc(demo(h.title))}</span></a></li>`).join("")}</ul></section>
  <section class="tile b-disc dark-card" aria-labelledby="b-disc"><p class="eyebrow">หน่วยบริการสุขภาพ</p><h2 id="b-disc">ค้นหาหน่วยบริการใกล้บ้าน</h2>${discoveryForm()}${areaChips}</section>

  <section class="tile b-act" aria-labelledby="b-act">${sh("b-act", "กิจกรรมในชุมชน", "/activities")}
    <ul>${acts.map((a) => `<li><a href="${href(a.href)}">${img(a.img, "", "ph")}<span class="meta">${esc(a.date)}</span><span class="t2">${esc(a.title)}</span></a></li>`).join("")}</ul></section>

  <section class="tile b-quick" aria-labelledby="b-quick"><h2 id="b-quick" class="h-sm">ข้อมูลและเอกสารสำคัญ</h2>
    <ul class="qlist">${d.home.quick.map((q) => `<li><a href="${href(q.href)}"><span class="ib sm">${ic(quickIcon(q), 18)}</span>${esc(q.label)}${ic("chev", 18, "chev")}</a></li>`).join("")}</ul></section>
  <section class="tile b-contact" aria-labelledby="b-contact"><div class="sh"><h2 id="b-contact">ติดต่อเรา</h2><a class="more" href="${O}/contact">ทั้งหมด ${ic("arrow", 16)}</a></div>${contactList}</section>
</div></main>`;

// ===== Variant C: task-first =====
const feed = [...news.map((n) => ({ ...n, kind: "ข่าว" })), ...anns.map((a) => ({ ...a, kind: "ประกาศ" }))];
const C = `
<main class="vC">
  <h1 class="sr">${SITE}</h1>
  <section class="wrap c-feat" aria-labelledby="c-feat"><a href="${href(F.href)}">${img(F.img, "", "th")}<span class="c-feat-t"><span class="chip">${ic("mega", 16)} เรื่องเด่น · ${esc(featuredNews?.date)}</span><h2 id="c-feat">${esc(F.title)}</h2></span><span class="more">อ่านต่อ ${ic("arrow", 16)}</span></a></section>

  <div class="c-task"><div class="wrap">
    <section aria-labelledby="c-q"><h2 id="c-q" class="c-big">วันนี้ต้องการทำอะไร?</h2>${searchForm("c")}</section>
    <section aria-labelledby="c-svc" class="c-svc"><h2 id="c-svc" class="sr">บริการประชาชน</h2>
      <ul>${services.map((s) => `<li><a href="${href(s.href)}"><span class="ib">${ic(sIcon(s), 24)}</span><span class="t2">${esc(demo(s.title))}</span></a></li>`).join("")}</ul>
      <a class="more on-dark" href="${O}/services">ดูบริการทั้งหมด ${ic("arrow", 16)}</a></section>
  </div></div>

  <section class="wrap sec" aria-labelledby="c-feed">${sh("c-feed", "อัปเดตล่าสุด", "/news", "ข่าวทั้งหมด")}
    <ol class="c-feed">${feed.map((f) => `<li><a href="${href(f.href)}">${f.img ? img(f.img, "", "th") : `<span class="th ann-ic">${ic("mega", 22)}</span>`}<span><span class="meta"><span class="tag ${f.kind === "ประกาศ" ? "warm" : ""}">${f.kind}${f.cat ? " · " + esc(f.cat) : ""}</span>${esc(f.date)}</span><span class="t2">${esc(f.title)}</span></span></a></li>`).join("")}</ol>
    <a class="more" href="${O}/announcements">ประกาศทั้งหมด ${ic("arrow", 16)}</a></section>

  <section class="wrap sec" aria-labelledby="c-health">${sh("c-health", "ความรู้สุขภาพ", "/health/content")}
    <ul class="c-health">${health.map((h, i) => `<li class="${i === 0 ? "big" : ""}"><a href="${href(h.href)}">${img(h.img, "", "ph")}<span class="topic">${esc(h.topic)}</span><span class="t2">${esc(demo(h.title))}</span>${i === 0 ? `<span class="sum">${esc(h.summary)}</span>` : ""}</a></li>`).join("")}</ul></section>

  <section class="wrap sec" aria-labelledby="c-disc"><div class="c-disc"><div><p class="eyebrow dark">หน่วยบริการสุขภาพ</p><h2 id="c-disc">ค้นหาหน่วยบริการใกล้บ้าน</h2>${areaChips}</div>${discoveryForm("inline")}</div></section>

  <section class="wrap sec" aria-labelledby="c-act">${sh("c-act", "กิจกรรมในชุมชน", "/activities")}
    <ul class="c-act">${acts.map((a, i) => `<li class="${i === 0 ? "big" : ""}"><a href="${href(a.href)}">${img(a.img, "", "ph")}<span class="cap"><span class="meta">${esc(a.date)}</span><span class="t2">${esc(a.title)}</span></span></a></li>`).join("")}</ul></section>

  <div class="wrap c-bottom">
    <section aria-labelledby="c-quick"><h2 id="c-quick" class="h-sm">ข้อมูลและเอกสารสำคัญ</h2><ul class="qlist">${d.home.quick.map((q) => `<li><a href="${href(q.href)}"><span class="ib sm">${ic(quickIcon(q), 18)}</span>${esc(q.label)}${ic("chev", 18, "chev")}</a></li>`).join("")}</ul></section>
    <section aria-labelledby="c-contact"><h2 id="c-contact" class="h-sm">ติดต่อเรา</h2>${contactList}</section>
  </div>
</main>`;

const css = `
:root{--ink:#13201b;--muted:#5a6a63;--line:#e1e8e4;--canvas:#f4f7f5;--surface:#fff;--brand:#0b6b57;--brand-ink:#0e3a30;--soft:#e8f4ee;--warm:#f3c95f;--warm-soft:#fdf3d7;--r:16px;--r-sm:12px}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:"Noto Sans Thai",system-ui,sans-serif;color:var(--ink);background:var(--canvas);font-size:16px;line-height:1.6}
a{color:inherit;text-decoration:none}ul,ol{list-style:none}img{display:block;max-width:100%}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ic{flex-shrink:0}
.wrap{max-width:1248px;margin:0 auto;padding-inline:24px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--brand);outline-offset:2px;border-radius:8px}
/* header */
.hd{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.hd-in{display:flex;align-items:center;gap:24px;height:68px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}.brand b{display:block;font-size:17px;line-height:1.3;font-weight:600}.brand small{display:block;font-size:12px;color:var(--muted);line-height:1.2}
.logo{width:38px;height:38px;border-radius:11px;background:var(--brand);color:#fff;display:grid;place-items:center;flex-shrink:0}
.hd-nav{display:flex;gap:4px;margin-left:auto}.hd-nav a{font-size:15px;padding:8px 12px;border-radius:999px;color:#2b3a34}.hd-nav a:hover{background:var(--canvas)}.hd-nav a[aria-current]{background:var(--soft);color:var(--brand);font-weight:600}
.hd-act{display:flex;align-items:center;gap:8px}
.icbtn{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.menu{display:none}
.pill-o{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);font-size:15px;font-weight:500;color:var(--brand);background:var(--surface)}
.pill-o.sm{height:34px;padding:0 14px;font-size:14px;margin-top:8px;width:max-content}
/* atoms */
.sec{padding-top:36px}
.sh{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px}
.sh h2{font-size:24px;line-height:1.35;font-weight:600;letter-spacing:-.01em}
.h-sm{font-size:18px;font-weight:600;line-height:1.4;margin-bottom:12px}
.more{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;color:var(--brand);font-size:15px;font-weight:500;white-space:nowrap}.more:hover{text-decoration:underline;text-underline-offset:4px}
.more.on-dark{color:#fff}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:var(--brand);background:var(--soft);padding:4px 12px;border-radius:999px;width:max-content}
.chip.on-dark{background:rgb(255 255 255/.16);color:#fff;backdrop-filter:blur(6px)}
.meta{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);line-height:1.5}
.tag{font-size:12px;font-weight:600;color:var(--brand);background:var(--soft);padding:1px 8px;border-radius:6px}.tag.warm{color:#7a5600;background:var(--warm-soft)}
.t1{display:block;font-weight:600;font-size:16px;line-height:1.45}
.t2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:600;font-size:15.5px;line-height:1.5}
.sum{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;color:var(--muted);line-height:1.55}
.topic{display:block;font-size:12.5px;font-weight:600;color:var(--brand);margin-bottom:2px}
.ib{width:44px;height:44px;border-radius:12px;background:var(--soft);color:var(--brand);display:grid;place-items:center;flex-shrink:0}.ib.sm{width:36px;height:36px;border-radius:10px}
.th{width:88px;height:88px;border-radius:10px;object-fit:cover;flex-shrink:0;background:var(--soft)}
.ph{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:var(--r-sm);background:var(--soft)}
a:hover .t1,a:hover .t2,a:hover .t-lead{color:var(--brand)}
.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1.5px solid #7a8a83;border-radius:14px;padding:6px 6px 6px 14px;color:var(--muted)}
.search input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:16px;height:44px;background:transparent;color:var(--ink)}
.search button,.disc button{font:inherit;font-weight:600;font-size:15px;border:0;border-radius:10px;background:var(--brand);color:#fff;height:44px;padding:0 20px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.disc{display:grid;gap:10px}.disc label{display:grid;gap:4px;font-size:13px;font-weight:500}
.disc select,.disc input{font:inherit;font-size:15px;height:44px;border-radius:10px;border:1.5px solid #7a8a83;padding:0 12px;background:#fff;color:var(--ink);width:100%}
.dark-card{background:var(--brand-ink);color:#fff;border-radius:var(--r);padding:24px}
.dark-card h2{font-size:21px;font-weight:600;line-height:1.4;margin-bottom:14px}.dark-card .disc label{color:#d8e7e0}.dark-card .disc button{background:var(--warm);color:var(--brand-ink)}
.eyebrow{font-size:13px;font-weight:600;color:var(--warm);margin-bottom:2px}.eyebrow.dark{color:var(--brand)}
.sub{font-size:13px;color:#cfe0d8;margin:16px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips a{font-size:14px;padding:6px 12px;border-radius:999px;border:1px solid rgb(255 255 255/.28);color:#fff}.chips a:hover{background:rgb(255 255 255/.1)}
.qlist{display:grid;gap:8px}.qlist a{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 14px;font-weight:600}.qlist .chev{margin-left:auto;color:var(--brand)}
.cl{display:grid;gap:14px}.cl div{display:grid;grid-template-columns:130px 1fr;gap:12px}.cl dt{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--muted);padding-top:2px}.cl dt .ic{color:var(--brand);margin-top:2px}.cl dd{display:grid;font-size:15.5px}
.tel{font-size:20px;font-weight:600;color:var(--brand)}
.row{display:flex;gap:14px;align-items:flex-start}
.ft{background:var(--brand-ink);color:#d9e8e1}.vB,.vC{padding-bottom:48px}.ft-in{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:22px;padding-bottom:22px;font-size:14px;flex-wrap:wrap}.ft b{color:#fff}.ft nav{display:flex;gap:18px;flex-wrap:wrap}.ft a{display:inline-flex;gap:4px;align-items:center}

/* ===== A ===== */
.vA{background:var(--surface)}
.a-hero{padding-top:24px}
.a-hero-card{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:48px;align-items:center;background:linear-gradient(135deg,var(--soft),#f3f8f1 60%,#fbf6e6);border-radius:24px;padding:40px 48px}
.a-hero-media{grid-column:2;grid-row:1}.a-hero-media img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center;border-radius:var(--r);box-shadow:0 18px 40px -18px rgb(14 58 48/.45)}
.a-hero-text{display:grid;gap:14px;grid-column:1;grid-row:1}
.a-title{font-size:40px;line-height:1.3;font-weight:700;letter-spacing:-.015em;max-width:15em}
.a-search{margin-top:18px}.a-search .lbl{font-size:15px;font-weight:600;margin-bottom:8px}
.search.big{padding:8px 8px 8px 18px;box-shadow:0 6px 20px -12px rgb(14 58 48/.35)}
.a-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.a-svc a{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid var(--line);border-radius:var(--r-sm);height:100%;transition:border-color .15s,box-shadow .15s}
.a-svc a:hover{border-color:var(--brand);box-shadow:0 8px 24px -16px rgb(14 58 48/.4)}.a-svc .chev{margin-left:auto;color:var(--brand)}.a-svc .sum{-webkit-line-clamp:1}
.a-news{display:grid;grid-template-columns:5fr 4fr 3.4fr;gap:28px;align-items:start}
.lead{display:grid;gap:8px}.t-lead{font-size:21px;font-weight:600;line-height:1.45}
.list{display:grid;gap:0}.list li+li{border-top:1px solid var(--line)}.list .row{padding:12px 0}.list li:first-child .row{padding-top:0}
.list .th{width:96px;height:72px}
.ann{background:var(--canvas);border-radius:var(--r);padding:18px 18px 8px}.ann-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.ann-h h3{display:flex;gap:8px;align-items:center;font-size:17px;font-weight:600}.ann-h .ic{color:var(--brand)}
.ann li+li,.annl li+li{border-top:1px solid var(--line)}.ann li a,.annl li a{display:grid;gap:4px;padding:12px 0}
.a-pair{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:stretch}
.a-health{display:grid;grid-template-columns:1fr 1fr;gap:12px}.a-health a{display:flex;gap:14px;padding:12px;border:1px solid var(--line);border-radius:var(--r-sm);height:100%}.a-health .th{width:96px;height:96px}
.a-disc{display:flex;flex-direction:column}.a-disc .dark-card{flex:1;margin-top:0}
.a-act{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.a-act a{display:grid;gap:8px}.a-act .ph{aspect-ratio:4/3}
.a-bottom{background:var(--soft);margin-top:48px;padding:36px 0}
.a-bottom-in{display:grid;grid-template-columns:4fr 8fr;gap:48px}.a-bottom .cl{grid-template-columns:1fr 1fr 1fr;display:grid;margin-bottom:14px}.a-bottom .cl div{grid-template-columns:1fr;gap:4px}
.vA+.ft{margin-top:0}

/* ===== B ===== */
.vB{padding-top:20px}
.bento{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:20px;min-width:0}
.tile .sh{margin-bottom:12px}.tile .sh h2{font-size:19px}
.b-feat{grid-column:1/8;grid-row:1/3;padding:0;overflow:hidden;position:relative;min-height:440px}
.b-feat a{display:block;height:100%}.b-feat img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 62%}
.b-feat .ov{position:absolute;inset:auto 0 0 0;padding:120px 28px 26px;background:linear-gradient(to top,rgb(9 36 30/.95),rgb(9 36 30/.7) 55%,transparent);color:#fff;display:grid;gap:10px}
.b-feat h2{font-size:32px;line-height:1.3;font-weight:700}
.b-search{grid-column:8/13}.b-svc{grid-column:8/13}
.b-svc ul{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:center}.b-svc{display:flex;flex-direction:column}.b-svc ul{flex:1}.b-svc li a{display:grid;justify-items:center;text-align:center;gap:8px;padding:12px 6px;border-radius:12px;height:100%}.b-svc li a:hover{background:var(--canvas)}.b-svc .t2{font-size:13.5px;font-weight:500;line-height:1.45}
.b-news{grid-column:1/9}.b-ann{grid-column:9/13}
.b-news-in{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.b-health{grid-column:1/9}.b-health ul{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.b-health li a{display:grid;gap:6px}.b-health .ph{aspect-ratio:1}
.b-disc{grid-column:9/13;background:var(--brand-ink);border-color:var(--brand-ink)}.b-disc .chips{margin-top:14px}
.b-act{grid-column:1/13}.b-act ul{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.b-act li a{display:grid;gap:6px}.b-act .ph{aspect-ratio:4/3}
.b-quick{grid-column:1/5}.b-contact{grid-column:5/13}.b-contact .cl{grid-template-columns:1fr 1fr 1fr}.b-contact .cl div{grid-template-columns:1fr;gap:4px}

/* ===== C ===== */
.vC{background:var(--surface)}
.c-feat{padding-top:16px}
.c-feat a{display:flex;align-items:center;gap:18px;border:1px solid var(--line);border-radius:var(--r);padding:12px 22px 12px 12px;background:linear-gradient(90deg,var(--warm-soft),#fff 45%)}
.c-feat .th{width:132px;height:84px}.c-feat-t{display:grid;gap:6px;min-width:0}.c-feat h2{font-size:20px;font-weight:600;line-height:1.4}.c-feat .more{margin-left:auto}
.c-task{background:var(--brand-ink);color:#fff;margin-top:16px;padding:36px 0 30px}
.c-big{font-size:34px;font-weight:700;line-height:1.3;margin-bottom:16px}
.c-task .search{max-width:760px;border-color:transparent;padding:8px 8px 8px 18px}
.c-svc{margin-top:28px;display:grid;gap:16px}
.c-svc ul{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.c-svc li a{display:grid;gap:10px;padding:16px;border-radius:14px;background:rgb(255 255 255/.07);border:1px solid rgb(255 255 255/.12);height:100%}.c-svc a:hover{background:rgb(255 255 255/.14)}
.c-svc .ib{background:rgb(255 255 255/.12);color:var(--warm)}.c-svc .t2{font-weight:500;font-size:15px;color:#fff}.c-svc a:hover .t2{color:#fff}
.c-feed{display:grid;grid-template-columns:1fr 1fr;column-gap:40px;margin-bottom:14px}
.c-feed li{border-top:1px solid var(--line)}.c-feed a{display:flex;gap:14px;padding:14px 0;align-items:flex-start}.c-feed .th{width:76px;height:76px}
.ann-ic{display:grid;place-items:center;color:#7a5600;background:var(--warm-soft)}
.c-health{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:20px;align-items:start}.c-health a{display:grid;gap:6px}.c-health .ph{aspect-ratio:1}.c-health .big .ph{aspect-ratio:16/10}.c-health .big .t2{font-size:19px}
.c-health .big{grid-row:span 1}
.c-disc{display:grid;grid-template-columns:1fr 1.4fr;gap:32px;align-items:center;border:1px solid var(--line);border-radius:var(--r);padding:24px 28px;background:linear-gradient(120deg,var(--soft),#fff)}
.c-disc h2{font-size:22px;font-weight:600;margin-bottom:12px}.c-disc .chips a{color:var(--brand);border-color:var(--line);background:#fff}
.disc.inline{grid-template-columns:1fr 1fr auto;align-items:end}
.c-act{display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:230px 230px;gap:16px}
.c-act li{position:relative}.c-act .big{grid-row:span 2}.c-act a{display:block;height:100%;position:relative;border-radius:var(--r);overflow:hidden}
.c-act .ph{height:100%;aspect-ratio:auto;border-radius:0;object-position:center 62%}
.c-act .cap{position:absolute;inset:auto 0 0 0;padding:40px 16px 14px;background:linear-gradient(to top,rgb(9 36 30/.9),transparent);color:#fff;display:grid;gap:2px}.c-act .cap .meta{color:#d5e6de}.c-act a:hover .t2{color:#fff;text-decoration:underline}
.c-act .big .t2{font-size:20px}
.c-act li:nth-child(4){grid-column:2/4}
.c-bottom{display:grid;grid-template-columns:4fr 8fr;gap:48px;margin-top:48px;padding-top:32px;border-top:1px solid var(--line)}.c-bottom .cl{grid-template-columns:1fr 1fr 1fr}.c-bottom .cl div{grid-template-columns:1fr;gap:4px}

/* ===== tablet ===== */
@media (max-width:1023px){
  .hd-nav{display:none}.menu{display:grid}.hd-act{margin-left:auto}
  .a-hero-card{grid-template-columns:1fr 280px;gap:28px;padding:28px}.a-title{font-size:30px}
  .a-svc{grid-template-columns:1fr 1fr}
  .a-news{grid-template-columns:1fr 1fr}.a-news .ann{grid-column:1/3}
  .a-pair{grid-template-columns:1fr}
  .a-act{grid-template-columns:1fr 1fr}
  .a-bottom-in,.c-bottom{grid-template-columns:1fr;gap:28px}
  .bento>.tile{grid-column:1/13}.b-feat{grid-row:auto;min-height:380px}
  .b-search,.b-svc{grid-column:1/13}.b-svc ul{grid-template-columns:repeat(6,1fr)}
  .b-news,.b-ann,.b-health,.b-disc{grid-column:1/13}
  .b-quick{grid-column:1/13}.b-contact{grid-column:1/13}
  .b-act ul{grid-template-columns:1fr 1fr}
  .c-svc ul{grid-template-columns:repeat(3,1fr)}
  .c-feed{grid-template-columns:1fr}
  .c-health{grid-template-columns:1fr 1fr}.c-health .big{grid-column:1/3}
  .c-disc{grid-template-columns:1fr}
}
/* ===== phone ===== */
@media (max-width:639px){
  .wrap{padding-inline:16px}
  .hd-in{height:60px;gap:8px}.brand b{font-size:15.5px}.pill-o{display:none}.hd .icbtn{width:44px;height:44px}
  .sh h2{font-size:20px}.sec{padding-top:28px}
  .a-hero{padding-top:12px}.a-hero-card{grid-template-columns:1fr;padding:16px;gap:16px;border-radius:20px}
  .a-hero-media{grid-column:1}.a-hero-text{grid-row:2}.a-hero-media img{aspect-ratio:16/9}.a-title{font-size:24px}
  .a-svc{grid-template-columns:1fr;gap:0;border:1px solid var(--line);border-radius:var(--r)}.a-svc li+li{border-top:1px solid var(--line)}.a-svc a{border:0;border-radius:0;padding:12px 14px}.a-svc .sum{display:none}.a-svc .ib{width:40px;height:40px}
  .a-news{grid-template-columns:1fr;gap:16px}.a-news .ann{grid-column:auto}.t-lead{font-size:18px}
  .a-health{grid-template-columns:1fr}.a-health .th{width:76px;height:76px}.a-health .sum{-webkit-line-clamp:1}
  .a-act{gap:12px}.a-act .t2{font-size:14.5px;-webkit-line-clamp:3}
  .a-bottom .cl,.b-contact .cl,.c-bottom .cl{grid-template-columns:1fr}
  .vB{padding-top:12px}.bento{gap:12px}.tile{padding:16px;border-radius:18px}
  .b-feat{min-height:340px}.b-feat h2{font-size:23px}.b-feat .ov{padding:90px 18px 18px}
  .b-svc ul{grid-template-columns:repeat(3,1fr)}
  .b-news-in{grid-template-columns:1fr}
  .b-health ul{grid-template-columns:1fr 1fr}.b-act ul{gap:12px}
  .c-feat a{padding:10px;gap:12px;flex-wrap:wrap}.c-feat .th{width:84px;height:84px}.c-feat h2{font-size:16.5px}.c-feat-t{flex:1}.c-feat .more{display:none}
  .c-task{padding:24px 0}.c-big{font-size:24px}
  .c-svc ul{grid-template-columns:1fr 1fr;gap:8px}.c-svc a{grid-template-columns:auto 1fr;align-items:center;padding:10px}.c-svc .ib{width:36px;height:36px}.c-svc .t2{font-size:14px}
  .c-feed .th{width:64px;height:64px}
  .c-health .sum{display:none}.c-health .big .t2{font-size:17px}
  .c-disc{padding:18px}.disc.inline{grid-template-columns:1fr}
  .c-act{grid-template-columns:1fr 1fr;grid-template-rows:220px 170px 170px}.c-act .big{grid-column:1/3;grid-row:auto}.c-act li:nth-child(4){grid-column:auto}.c-act li:nth-child(4){grid-column:1/3}
  .ft-in{flex-direction:column;align-items:flex-start}
}

/* ===== A2: A with room to breathe (PO: "แน่นกันเกินไปไหม?") ===== */
.bal .sec{padding-top:72px}.bal .a-hero{padding-top:32px}
.bal .sh{margin-bottom:22px}.bal .sh h2{font-size:27px}
.bal .meta{font-size:14px}.bal .tag{font-size:13px}
.bal .t2{-webkit-line-clamp:3;font-size:17px;line-height:1.55}.bal .sum{-webkit-line-clamp:3;font-size:15px}
.bal .a-hero-card{grid-template-columns:minmax(0,1fr) 480px;padding:56px 64px;gap:64px}.bal .a-title{font-size:42px}
.bal .a-svc{gap:16px}.bal .a-svc a{padding:20px;align-items:flex-start}.bal .a-svc .sum{-webkit-line-clamp:2;margin-top:2px}.bal .a-svc .chev{align-self:center}
.bal .a-news{grid-template-columns:1.2fr 1fr;gap:28px 40px}.bal .a-news .lead{grid-row:1}.bal .a-news .list{grid-row:1}
.bal .a-news .ann{grid-column:1/3;padding:22px 24px 10px}.bal .ann ul{display:grid;grid-template-columns:1fr 1fr;column-gap:40px}
.bal .ann li+li{border-top:0}.bal .ann li{border-top:1px solid var(--line)}.bal .ann li a{padding:14px 0}
.bal .list .row{padding:16px 0}.bal .list .th{width:112px;height:84px}.bal .t-lead{font-size:23px}
.bal .a-pair{gap:40px}.bal .a-health{gap:16px}.bal .a-health a{padding:16px}.bal .a-health .th{width:104px;height:104px}
.bal .dark-card{padding:32px}
.bal .a-act{gap:28px}
.bal .a-bottom{margin-top:88px;padding:56px 0}
@media (max-width:1023px){.bal .a-hero-card{grid-template-columns:1fr 300px;padding:36px;gap:32px}.bal .a-title{font-size:32px}}
@media (max-width:639px){.bal .sec{padding-top:44px}.bal .a-hero-card{grid-template-columns:1fr;padding:18px;gap:18px}.bal .a-title{font-size:25px}.bal .sh h2{font-size:21px}
 .bal .a-news{grid-template-columns:1fr}.bal .a-news .lead,.bal .a-news .list{grid-row:auto}.bal .a-news .ann{grid-column:auto}.bal .ann ul{grid-template-columns:1fr}.bal .ann li:first-child{border-top:0}
 .bal .a-svc a{padding:14px}.bal .list .th{width:88px;height:72px}.bal .a-bottom{margin-top:56px;padding:40px 0}.bal .t2{font-size:16px}}
/* prototype bar */
.pbar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:6px;background:#111;color:#fff;border-radius:999px;padding:6px;font:500 14px system-ui;box-shadow:0 10px 30px rgb(0 0 0/.35)}
.pbar button{width:36px;height:36px;border-radius:999px;border:0;background:#333;color:#fff;cursor:pointer;display:grid;place-items:center}.pbar span{padding:0 10px;white-space:nowrap}
body.shot .pbar{display:none}
`;
const names = { A: "A · Editorial (แน่น)", A2: "A2 · Editorial (พอดี)", B: "B · Bento tiles", C: "C · Task-first" };
const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PROTOTYPE · Homepage redesign</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
${header}
<template id="A">${A}</template><template id="B">${B}</template><template id="C">${C}</template><template id="A2">${A.replace('<main class="vA">', '<main class="vA bal">')}</template>
<div id="slot"></div>
${footer}
<div class="pbar" data-prototype-toolbar><button data-step="-1" aria-label="ก่อนหน้า">${ic("left", 18)}</button><span id="lbl"></span><button data-step="1" aria-label="ถัดไป">${ic("chev", 18)}</button></div>
<script>
const keys=["A","A2","B","C"],names=${JSON.stringify(names)};
const p=new URLSearchParams(location.search);if(p.has("shot"))document.body.classList.add("shot");
let v=keys.includes(p.get("variant"))?p.get("variant"):"A";
function show(){document.getElementById("slot").replaceChildren(document.getElementById(v).content.cloneNode(true));document.getElementById("lbl").textContent=names[v];}
function step(n){v=keys[(keys.indexOf(v)+n+keys.length)%keys.length];p.set("variant",v);history.replaceState(null,"","?"+p);show();}
document.querySelectorAll(".pbar button").forEach(b=>b.onclick=()=>step(+b.dataset.step));
addEventListener("keydown",e=>{if(e.target.closest("input,textarea,select,[contenteditable]"))return;if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1);});
show();
</script></body></html>`;
await writeFile(new URL("home-redesign.html", here), html);
console.log("wrote", new URL("home-redesign.html", here).pathname);

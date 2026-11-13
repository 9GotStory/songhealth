// PROTOTYPE (throwaway): Homepage redesign "G · Modern government, minimal" (Product Owner,
// 2026-11-10: "ออกแบบ design frontend ใหม่ทั้งหมด สำหรับเว็บราชการ สมัยใหม่ Modern minimal").
// Real content from the dev runtime (data.json, extract.mjs; images in ./img). Section order of
// 04-homepage §3 is kept in the DOM.
// node .tmp/prototypes/home-redesign/build-gov.mjs  →  .tmp/prototypes/home-redesign/home-gov.html
import { readFile, writeFile } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const d = JSON.parse(await readFile(new URL("data.json", here), "utf8"));
const O = "http://127.0.0.1:4324";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const demo = (s) => String(s ?? "").replace(/^\[ตัวอย่าง\]\s*/, "");
const href = (h) => O + h;
const KEEP = /อำเภอสอง|เจ้าหน้าที่|เจ้าพนักงาน|เบาหวาน|สาธารณสุข|ลูกจ้างชั่วคราว|ผู้สูงอายุ|ยุงลาย|ประสบการณ์|ร้องเรียน/g;
const tt = (s) => esc(s).replace(KEEP, (w) => `<span class="g-nw">${w}</span>`);
const I = {
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
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
	menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
	plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
};
const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const serviceIcon = { complaint: "msg", feedback: "bulb", "health-problem": "pulse", "information-request": "file", vhv: "users", "general-inquiry": "help" };
const sIcon = (s) => serviceIcon[Object.keys(serviceIcon).find((k) => s.href.endsWith(k))] ?? "file";
const img = (src, cls = "") => `<img class="${cls}" src="img/${String(src).split("/").pop()}" alt="">`;

const F = d.home.featured;
const fDate = d.news.find((n) => n.href === F.href)?.date;
const news = d.news.filter((n) => n.href !== F.href).slice(0, 5);
const anns = d.announcements.slice(0, 4).map((a) => ({ ...a, cat: a.meta[0]?.split("•")[0] }));
const health = d.healthList.slice(0, 4).map((h) => ({ ...h, topic: h.meta[0]?.split("•")[0], summary: h.meta[1] }));
const acts = d.activities.slice(0, 4);
const contact = Object.fromEntries(d.home.contact.map((c) => [c.k, demo(c.v.replace("เปิดแผนที่(เปิดในแท็บใหม่)", ""))]));
const SITE = "สำนักงานสาธารณสุขอำเภอสอง";
const LEAD = "ศูนย์กลางข้อมูล บริการ และการประสานงานด้านสุขภาพของประชาชนในอำเภอสอง จังหวัดแพร่";
const nav = d.home.nav.slice(0, 7);
const sh = (id, title, link, more) => `<div class="g-sh g-rv"><h2 id="${id}">${title}</h2>${link ? `<a class="g-more" href="${href(link)}"><span class="g-sr">ดู${title}</span>ทั้งหมด ${ic("arrow", 18)}</a>` : ""}</div>`;

const body = `
<a class="g-skip" href="#main">ข้ามไปยังเนื้อหา</a>
<div class="g-official"><div class="g-wrap"><span class="g-flag" aria-hidden="true"></span>เว็บไซต์ทางการของหน่วยงานรัฐ <span class="g-official-sub">· กระทรวงสาธารณสุข</span></div></div>
<header class="g-hd"><div class="g-wrap g-hd-in">
  <a class="g-brand" href="${O}/"><span class="g-logo">${ic("plus", 24)}</span><span><b>${SITE}</b><small>Song District Public Health Office · จังหวัดแพร่</small></span></a>
  <nav class="g-nav" aria-label="เมนูหลัก">${nav.map((n, i) => `<a ${i === 0 ? 'aria-current="page"' : ""} href="${href(n.href)}">${esc(n.label)}</a>`).join("")}</nav>
  <div class="g-hd-act"><a class="g-btn ghost" href="${O}/contact">ติดต่อเรา</a><button class="g-menu" aria-label="เปิดเมนู">${ic("menu", 24)}</button></div>
</div></header>

<main id="main">
  <div class="g-hero"><div class="g-wrap g-hero-in">
    <div class="g-hero-text">
      <h1 class="g-sr">${SITE}</h1>
      <p class="g-hl">${tt(LEAD)}</p>
      <section aria-labelledby="g-q" class="g-search-box">
        <h2 id="g-q">คุณกำลังมองหาอะไร?</h2>
        <form class="g-search" action="${O}/search" role="search"><label class="g-sr" for="q">คำค้นหา</label><input id="q" name="q" type="search" placeholder="ค้นหาบริการ ข่าวสาร หน่วยบริการ หรือเอกสาร"><button>${ic("search", 20)} ค้นหา</button></form>
      </section>
    </div>
    <section class="g-feat" aria-labelledby="g-feat"><a href="${href(F.href)}">
      <span class="g-feat-img">${img(F.img)}</span>
      <span class="g-feat-body"><span class="g-kicker">เรื่องเด่น<span class="g-date"> · ${esc(fDate)}</span></span><h2 id="g-feat">${tt(F.title)}</h2><span class="g-more">อ่านต่อ ${ic("arrow", 18)}</span></span>
    </a></section>
  </div></div>

  <section class="g-wrap g-sec" aria-labelledby="g-svc">
    ${sh("g-svc", "บริการประชาชน", "/services", "ดูบริการทั้งหมด")}
    <ul class="g-svc g-rv">${d.home.services.map((s) => `<li><a href="${href(s.href)}"><span class="g-ib">${ic(sIcon(s), 24)}</span><span class="g-svc-t"><span class="g-svc-h"><b>${tt(demo(s.title))}</b>${ic("arrow", 20)}</span><span class="g-svc-s">${esc(s.summary)}</span></span></a></li>`).join("")}</ul>
  </section>

  <section class="g-wrap g-sec" aria-labelledby="g-news">
    ${sh("g-news", "ข่าวประชาสัมพันธ์", "/news", "ดูข่าวทั้งหมด")}
    <div class="g-news g-rv">
      <a class="g-news-lead" href="${href(news[0].href)}">${img(news[0].img)}<span class="g-date">${esc(news[0].date)}</span><b>${tt(news[0].title)}</b></a>
      <ul class="g-news-list">${news.slice(1).map((n) => `<li><a href="${href(n.href)}">${img(n.img)}<span><span class="g-date">${esc(n.date)}</span><b>${tt(n.title)}</b></span></a></li>`).join("")}</ul>
    </div>
    <div class="g-ann g-rv">
      <div class="g-ann-h"><h3 id="g-ann">ประกาศ</h3><p>ข้อมูลที่อาจมีวันสิ้นสุดหรือการดำเนินการ</p><a class="g-more" href="${O}/announcements"><span class="g-sr">ดูประกาศ</span>ทั้งหมด ${ic("arrow", 18)}</a></div>
      <ul aria-labelledby="g-ann">${anns.map((a) => `<li><a href="${href(a.href)}"><span class="g-ann-m"><span class="g-tag">${esc(a.cat)}</span><span class="g-date">${esc(a.date)}</span></span><b>${tt(a.title)}</b></a></li>`).join("")}</ul>
    </div>
  </section>

  <div class="g-tint"><section class="g-wrap g-sec" aria-labelledby="g-health">
    ${sh("g-health", "ความรู้สุขภาพ", "/health/content", "ดูความรู้สุขภาพทั้งหมด")}
    <ul class="g-cards g-rv">${health.map((h) => `<li><a href="${href(h.href)}">${img(h.img)}<span class="g-card-b"><span class="g-topic">${esc(h.topic)}</span><b>${tt(demo(h.title))}</b><span class="g-sum">${esc(h.summary)}</span></span></a></li>`).join("")}</ul>
  </section></div>

  <section class="g-disc" aria-labelledby="g-disc"><div class="g-wrap g-disc-in g-rv">
    <div><h2 id="g-disc">หน่วยบริการสุขภาพ<span class="g-nw">ในอำเภอสอง</span></h2><p>เลือกตำบลหรือพิมพ์ชื่อ เพื่อดูข้อมูลติดต่อ เวลาเปิดบริการ และแผนที่</p></div>
    <form action="${O}/health-services">
      <label><span>พื้นที่รับผิดชอบ</span><select name="area"><option>ทุกพื้นที่</option>${d.home.areas.map((a) => `<option>${esc(a)}</option>`).join("")}</select></label>
      <label><span>ชื่อหน่วยบริการ</span><input name="name" type="search"></label>
      <button>${ic("search", 20)} ค้นหา</button>
    </form>
  </div></section>

  <section class="g-wrap g-sec" aria-labelledby="g-act">
    ${sh("g-act", "กิจกรรม", "/activities", "ดูกิจกรรมทั้งหมด")}
    <ul class="g-cards g-acts g-rv">${acts.map((a) => `<li><a href="${href(a.href)}">${img(a.img)}<span class="g-card-b"><span class="g-date">${esc(a.date)}</span><b>${tt(a.title)}</b></span></a></li>`).join("")}</ul>
  </section>

  <div class="g-wrap g-sec g-bottom">
    <section aria-labelledby="g-quick"><h2 id="g-quick">ข้อมูลและเอกสารสำคัญ</h2>
      <ul class="g-quick">${d.home.quick.map((q) => `<li><a href="${href(q.href)}">${esc(q.label)} ${ic("arrow", 20)}</a></li>`).join("")}</ul></section>
    <section aria-labelledby="g-contact" class="g-contact"><h2 id="g-contact">ติดต่อสำนักงาน</h2>
      <dl>
        <div><dt>${ic("pin", 20)} ที่ตั้ง</dt><dd><span>${tt(contact["ที่ตั้ง"])}</span><a class="g-inline" href="#">เปิดแผนที่ ${ic("out", 16)}</a></dd></div>
        <div><dt>${ic("phone", 20)} โทรศัพท์</dt><dd><a class="g-tel" href="tel:054000000">${esc(contact["โทรศัพท์"])}</a></dd></div>
        <div><dt>${ic("clock", 20)} เวลาทำการ</dt><dd>${esc(contact["เวลาทำการ"]).replace("08.30–16.30 น.", '<span class="g-nw">08.30–16.30 น.</span>')}</dd></div>
      </dl>
      <a class="g-more" href="${O}/contact">ช่องทางติดต่ออื่น ${ic("arrow", 18)}</a></section>
  </div>
</main>

<footer class="g-ft"><div class="g-wrap g-ft-in">
  <div><p class="g-ft-name">${SITE}</p><p>จังหวัดแพร่ · กระทรวงสาธารณสุข</p></div>
  <nav aria-label="ช่องทางทางการ"><p class="g-ft-h">ช่องทางทางการ</p><a href="#">Facebook ${ic("out", 14)}</a><a href="#">LINE ${ic("out", 14)}</a><a href="#">YouTube ${ic("out", 14)}</a></nav>
  <nav aria-label="เกี่ยวกับเว็บไซต์"><p class="g-ft-h">เกี่ยวกับเว็บไซต์</p><a href="#">นโยบายความเป็นส่วนตัว</a><a href="#">การเข้าถึงเว็บไซต์</a><a href="${O}/contact">ติดต่อเรา</a></nav>
</div></footer>`;

const css = `
/* colours: the tokens of src/styles/global.css only */
:root{--ink:#16211d;--body:#16211d;--muted:#65736d;--muted-soft:#5d6a64;--line:#dce7e2;--line-strong:#7a8a83;--canvas:#f6f9f7;--white:#fff;--brand:#0b6b57;--deep:#123c33;--tint:#eaf5f0;--gold:#f3c95f;--topic-green:#ebf7f0;--topic-blue:#f0f5fc}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:"Noto Sans Thai",system-ui,sans-serif;color:var(--body);background:var(--white);font-size:17px;line-height:1.65}
a{color:inherit;text-decoration:none}ul{list-style:none}img{display:block;max-width:100%}b{font-weight:600}
.ic{flex-shrink:0}
.g-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.g-skip{position:absolute;left:-999px}.g-skip:focus{left:8px;top:8px;background:var(--gold);color:var(--ink);padding:8px 12px;z-index:9}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--brand);outline-offset:2px}.g-hero :focus-visible,.g-ft :focus-visible{outline-color:var(--gold)}.g-hero .g-search:focus-within{outline-color:var(--gold)}
.g-wrap{max-width:1248px;margin-inline:auto;padding-inline:24px}
/* official strip */
.g-official{background:var(--canvas);border-bottom:1px solid var(--line);font-size:13.5px;color:var(--muted);line-height:1.4}
.g-official .g-wrap{display:flex;align-items:center;gap:10px;padding-block:7px}
.g-flag{width:21px;height:14px;flex-shrink:0;border-radius:2px;background:linear-gradient(#a51931 0 16.6%,#f4f5f8 0 33.3%,#2d2a4a 0 66.6%,#f4f5f8 0 83.3%,#a51931 0);box-shadow:0 0 0 1px var(--line)}
/* header */
.g-hd{border-bottom:1px solid var(--line);background:var(--white)}
.g-hd-in{display:flex;align-items:stretch;gap:20px;min-height:80px}
.g-brand{display:flex;align-items:center;gap:14px;padding-block:14px;min-width:0}
.g-logo{width:48px;height:48px;border-radius:14px;background:var(--brand);color:#fff;display:grid;place-items:center;flex-shrink:0}
.g-brand b{white-space:nowrap;display:block;font-size:19px;line-height:1.3;color:var(--ink)}.g-brand small{display:block;font-size:13px;color:var(--muted);line-height:1.4}
.g-nav{display:flex;margin-left:auto}
.g-nav a{white-space:nowrap;display:flex;align-items:center;padding-inline:11px;font-size:15.5px;font-weight:500;color:var(--body);border-bottom:3px solid transparent;border-top:3px solid transparent}
.g-nav a:hover{color:var(--brand);border-bottom-color:var(--line-strong)}.g-nav a[aria-current]{color:var(--brand);border-bottom-color:var(--brand);font-weight:600}
.g-hd-act{display:flex;align-items:center;gap:8px}
.g-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding-inline:18px;border-radius:999px;font-weight:600;font-size:16px;background:var(--brand);color:#fff}
.g-btn.ghost{background:transparent;color:var(--brand);border:1.5px solid var(--brand)}.g-btn.ghost:hover{background:var(--tint)}
.g-menu{display:none;width:48px;height:48px;border:1.5px solid var(--line-strong);border-radius:14px;background:#fff;color:var(--ink);place-items:center;cursor:pointer}
/* hero */
.g-hero{background:var(--deep);color:#fff}.g-hl{color:#fff!important}.g-hero .g-lead{color:#d5e4dd}.g-hero .g-search-box h2{color:#fff}.g-hero .g-search{border-color:#fff}.g-hero .g-facts{color:#d5e4dd}.g-hero .g-facts a{color:#fff}.g-hero .g-facts .ic{color:var(--gold)}.g-hero .g-feat a{border-color:transparent;box-shadow:0 24px 48px -24px rgb(0 0 0/.5)}
.g-hero-in{display:grid;grid-template-columns:minmax(0,1fr) 456px;gap:72px;align-items:center;padding-block:52px}
.g-hl{text-wrap:balance;max-width:17em;font-size:40px;line-height:1.25;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.g-hl span,.g-nw{white-space:nowrap}.g-hl::before{content:"";display:block;width:64px;height:5px;background:var(--gold);margin-bottom:22px}
.g-lead{text-wrap:balance;font-size:20px;line-height:1.65;color:var(--muted);margin-top:14px;max-width:32em}
.g-search-box{margin-top:36px}.g-search-box h2{font-size:17px;font-weight:600;color:var(--ink);margin-bottom:8px}
.g-search{display:flex;align-items:center;padding:5px;max-width:640px;border:2px solid var(--ink);border-radius:14px;background:#fff;overflow:hidden}
.g-search input{flex:1;min-width:0;border:0;outline:0;font:inherit;height:46px;padding-inline:14px;color:var(--ink);background:transparent}
.g-search:focus-within{outline:3px solid var(--brand);outline-offset:2px}
.g-search button{height:46px;border-radius:999px;font:inherit;font-weight:600;border:0;background:var(--brand);color:#fff;padding-inline:24px;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.g-facts{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:22px;font-size:16px;color:var(--muted)}.g-facts li{display:flex;align-items:center;gap:8px}.g-facts .ic{color:var(--brand)}.g-facts a{color:var(--ink);font-weight:600}
.g-feat a{display:block;background:#fff;border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 24px 48px -32px rgb(11 59 48/.45)}
.g-feat-img{display:block;background:var(--tint);border-bottom:1px solid var(--line)}.g-feat-img img{width:100%;height:340px;object-fit:contain;padding-block:16px}
.g-feat-body{display:grid;gap:8px;padding:22px 24px 24px}
.g-kicker{font-size:14px;font-weight:700;color:var(--brand);letter-spacing:.02em}.g-kicker .g-date{font-weight:400}
.g-feat h2{font-size:24px;line-height:1.4;font-weight:600;color:var(--ink)}.g-feat a:hover h2{color:var(--brand);text-decoration:underline;text-underline-offset:5px}
.g-date{font-size:14.5px;color:var(--muted)}
.g-more{display:inline-flex;align-items:center;gap:8px;color:var(--brand);font-weight:600;font-size:16px;white-space:nowrap}.g-more:hover{text-decoration:underline;text-underline-offset:5px}
/* sections */
.g-sec{padding-block:68px 0}.g-tint .g-sec{padding-block:68px}
.g-sh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-top:1px solid var(--line);padding-top:20px;margin-bottom:32px;position:relative}
.g-sh::before{content:"";position:absolute;top:-2px;left:0;width:64px;height:3px;background:var(--brand)}
.g-sh h2{font-size:34px;line-height:1.35;font-weight:700;color:var(--ink)}
/* services: ruled grid */
.g-svc{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--line);gap:1px}
.g-svc a{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;padding:24px;background:#fff;height:100%}
.g-svc a:hover{background:var(--tint)}.g-svc a:hover b{color:var(--brand);text-decoration:underline;text-underline-offset:5px}
.g-ib{width:48px;height:48px;border-radius:14px;background:var(--tint);color:var(--brand);display:grid;place-items:center}
.g-svc-t{display:grid;gap:4px}.g-svc-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.g-svc-h .ic{color:var(--brand);margin-top:4px}.g-svc-t{padding-top:8px}.g-svc-t b{font-size:18px;line-height:1.5;color:var(--ink)}.g-svc-s{font-size:15px;color:var(--muted);line-height:1.6;grid-column:1}
.g-go{color:var(--brand);padding-top:12px}
/* news */
.g-news{display:grid;grid-template-columns:7fr 5fr;gap:56px}
.g-news-lead{display:grid;gap:10px;align-content:start}.g-news-lead img{width:100%;aspect-ratio:16/9;object-fit:cover;object-position:center 62%;border-radius:20px;border:1px solid var(--line);margin-bottom:6px}
.g-news-lead b{font-size:26px;line-height:1.4;color:var(--ink)}
.g-news-list li{border-top:1px solid var(--line)}.g-news-list li:first-child{border-top:0}.g-news-list li:first-child a{padding-top:0}
.g-news-list a{display:flex;gap:18px;padding-block:20px}.g-news-list img{width:120px;height:90px;object-fit:cover;object-position:center 60%;border-radius:14px;border:1px solid var(--line);flex-shrink:0}
.g-news-list a>span{display:grid;gap:4px;align-content:start}.g-news-list b{font-size:17.5px;line-height:1.5;color:var(--ink)}
.g-news a:hover b,.g-ann li a:hover b,.g-cards a:hover b{color:var(--brand);text-decoration:underline;text-underline-offset:5px}
.g-ann{display:grid;grid-template-columns:3fr 9fr;gap:48px;margin-top:44px;background:var(--canvas);border-left:4px solid var(--gold);border-radius:0 24px 24px 0;padding:32px 36px}
.g-ann-h{display:grid;gap:8px;align-content:start}.g-ann-h h3{font-size:24px;font-weight:700;color:var(--ink);line-height:1.3}.g-ann-h p{font-size:15.5px;color:var(--muted-soft)}.g-ann-h .g-more{margin-top:8px}
.g-ann ul{display:grid;grid-template-columns:1fr 1fr;column-gap:48px}
.g-ann li{border-top:1px solid var(--line)}.g-ann li:nth-child(-n+2){border-top:0}.g-ann li:nth-child(-n+2) a{padding-top:0}
.g-ann li a{display:grid;gap:6px;padding-block:18px}.g-ann li b{font-size:17px;line-height:1.55;color:var(--ink)}
.g-ann-m{display:flex;align-items:center;gap:12px}
.g-tag{font-size:13px;font-weight:600;color:var(--deep);background:#fff;border:1px solid var(--line);border-radius:999px;padding:1px 9px}
/* cards */
.g-tint{background:var(--white)}
.g-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:28px}
.g-cards a{display:flex;flex-direction:column;height:100%;background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden}
.g-cards img{width:100%;aspect-ratio:16/9;object-fit:cover;object-position:center;border-bottom:1px solid var(--line)}
.g-card-b{display:grid;gap:6px;padding:18px 20px 22px;align-content:start}.g-card-b b{font-size:18px;line-height:1.5;color:var(--ink)}
.g-topic{font-size:14px;font-weight:700;color:var(--brand)}.g-sum{font-size:15.5px;color:var(--muted);line-height:1.6}
.g-acts img{aspect-ratio:4/3}
/* discovery band */
.g-disc{background:var(--tint);color:var(--ink);border-block:1px solid var(--line)}
.g-disc-in{display:grid;grid-template-columns:5fr 7fr;gap:64px;align-items:center;padding-block:52px}
.g-disc h2{font-size:32px;line-height:1.35;font-weight:700}.g-disc h2::before{content:"";display:block;width:64px;height:4px;background:var(--brand);margin-bottom:18px}
.g-disc p{color:var(--muted-soft);margin-top:10px}
.g-disc form{display:grid;grid-template-columns:1fr 1fr auto;gap:14px;align-items:end;background:#fff;border:1px solid var(--line);color:var(--ink);padding:22px;border-radius:18px}
.g-disc label{display:grid;gap:6px;font-size:15px;font-weight:600}
.g-disc select,.g-disc input{font:inherit;height:52px;border:1.5px solid var(--line-strong);border-radius:14px;padding-inline:14px;background:#fff;color:var(--ink);width:100%}
.g-disc button{font:inherit;font-weight:600;height:52px;border:0;border-radius:999px;background:var(--brand);color:#fff;padding-inline:20px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
/* bottom */
.g-bottom{display:grid;grid-template-columns:5fr 7fr;gap:72px;padding-bottom:80px}
.g-bottom h2{font-size:26px;font-weight:700;color:var(--ink);line-height:1.3;border-top:1px solid var(--line);padding-top:20px;margin-bottom:20px;position:relative}
.g-bottom h2::before{content:"";position:absolute;top:-2px;left:0;width:64px;height:3px;background:var(--brand)}
.g-quick li{border-bottom:1px solid var(--line)}.g-quick a{display:flex;justify-content:space-between;align-items:center;padding-block:18px;font-size:19px;font-weight:600;color:var(--ink)}.g-quick a:hover{color:var(--brand)}.g-quick .ic{color:var(--brand)}
.g-contact dl{display:grid;grid-template-columns:1.5fr 1fr 1.2fr;gap:28px;margin-bottom:24px}
.g-contact dt{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--muted);margin-bottom:6px}.g-contact dt .ic{color:var(--brand)}
.g-contact dd{color:var(--ink);display:grid;gap:8px;justify-items:start}
.g-tel{font-size:26px;font-weight:700;color:var(--brand);line-height:1.3}
.g-inline{display:inline-flex;gap:6px;align-items:center;color:var(--brand);font-weight:600;font-size:15.5px;text-decoration:underline;text-underline-offset:4px}
/* footer */
.g-ft{background:var(--deep);color:#d5e4dd;font-size:15.5px;border-top:5px solid var(--gold)}
.g-ft-in{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;padding-block:48px}
.g-ft-name{font-size:19px;font-weight:600;color:#fff;margin-bottom:8px}.g-ft-h{font-weight:600;color:#fff;margin-bottom:8px}
.g-ft nav{display:grid;gap:6px;align-content:start;justify-items:start}.g-ft nav a{display:inline-flex;gap:6px;align-items:center}.g-ft nav a:hover{color:#fff;text-decoration:underline}

/* ===== motion: CSS only, off under prefers-reduced-motion ===== */
.g-more .ic,.g-svc-h .ic,.g-quick .ic{transition:transform .2s ease}
a:hover .g-more .ic,.g-more:hover .ic,.g-svc a:hover .g-svc-h .ic,.g-quick a:hover .ic{transform:translateX(4px)}
.g-svc a,.g-nav a,.g-btn,.g-quick a{transition:background-color .2s,color .2s,border-color .2s}
.g-search button,.g-disc button,.g-btn{transition:background-color .2s,transform .1s}.g-search button:hover,.g-disc button:hover{background:var(--deep)}.g-search button:active,.g-disc button:active,.g-btn:active{transform:scale(.97)}
.g-cards a,.g-feat a{transition:transform .25s ease,box-shadow .25s ease,border-color .25s}
.g-cards img,.g-news-list img,.g-news-lead img{transition:transform .5s ease}
@media (hover:hover){.g-cards:not(.g-acts) a:hover,.g-acts a:hover,.g-feat a:hover{transform:translateY(-4px);box-shadow:0 10px 15px rgb(13 46 36/.08);border-color:var(--brand)}.g-cards a:hover img{transform:scale(1.04)}}
/* loading: a shimmer shows where a picture is still on its way */
.g-feat-img,.g-cards img,.g-news-list img,.g-news-lead img{background:linear-gradient(100deg,var(--tint) 30%,var(--canvas) 50%,var(--tint) 70%) 0 0/200% 100%}
button.is-loading{pointer-events:none;opacity:.85}button.is-loading .ic{animation:g-spin .8s linear infinite}
button.is-loading .ic *{display:none}button.is-loading .ic{border:2px solid currentColor;border-right-color:transparent;border-radius:999px}
@keyframes g-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:no-preference){
  html{scroll-behavior:smooth}
  @keyframes g-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  @keyframes g-bar{from{width:0}}
  @keyframes g-shimmer{to{background-position:-200% 0}}
  .g-hero-text>*,.g-feat{animation:g-up .7s cubic-bezier(.2,.7,.2,1) both}
  .g-hero-text>:nth-child(3){animation-delay:.12s}.g-feat{animation-delay:.24s}
  .g-hl::before{animation:g-bar .6s .2s cubic-bezier(.2,.7,.2,1) both}
  .g-feat-img,.g-cards img,.g-news-list img,.g-news-lead img{animation:g-shimmer 1.6s linear infinite}
  @supports (animation-timeline:view()){
    .g-rv{animation:g-up linear both;animation-timeline:view();animation-range:entry 0% entry 55%}
    .g-sh::before,.g-disc h2::before{animation:g-bar linear both;animation-timeline:view();animation-range:entry 20% entry 90%}
  }
}
.shot *,.shot *::before{animation:none!important}
/* tablet */
@media (max-width:1100px){
  .g-nav{display:none}.g-menu{display:grid}.g-hd-act{margin-left:auto}
  .g-hero-in{grid-template-columns:minmax(0,1fr) 320px;gap:40px;padding-block:48px}.g-hl{font-size:32px}.g-lead{font-size:18px}
  .g-svc{grid-template-columns:1fr 1fr}
  .g-news{grid-template-columns:1fr 1fr;gap:32px}.g-news-lead b{font-size:21px}.g-news-list img{width:96px;height:72px}
  .g-ann{grid-template-columns:1fr;gap:20px}
  .g-cards{grid-template-columns:1fr 1fr;gap:20px}.g-cards:not(.g-acts) a{flex-direction:row}.g-cards:not(.g-acts) img{width:38%;aspect-ratio:auto;border-bottom:0;border-right:1px solid var(--line)}.g-acts img{aspect-ratio:16/10}
  .g-disc-in{grid-template-columns:1fr;gap:28px}
  .g-bottom{grid-template-columns:1fr;gap:56px}
  .g-sec{padding-top:56px}.g-bottom{padding-bottom:64px}
}
/* phone */
@media (max-width:639px){
  body{font-size:16.5px}.g-wrap{padding-inline:16px}
  .g-official-sub{display:none}
  .g-hd-in{min-height:68px;gap:12px}.g-logo{width:42px;height:42px}.g-brand b{font-size:16.5px}.g-brand small{display:none}.g-hd-act .g-btn{display:none}
  .g-hero-in{grid-template-columns:1fr;gap:24px;padding-block:28px 32px}.g-hl{font-size:25px}.g-hl::before{width:48px;height:4px;margin-bottom:16px}
  .g-lead{font-size:17px;margin-top:10px}.g-search-box{margin-top:24px}.g-search button{padding-inline:16px}.g-search input{padding-inline:14px}
  .g-feat h2{font-size:21px}.g-feat-body{padding:18px}.g-feat-img img{height:220px;padding-block:12px}
  .g-facts{display:none}.g-sec{padding-top:36px}.g-tint .g-sec{padding-block:40px}.g-bottom{gap:40px;padding-bottom:48px}.g-news-list li:nth-child(n+3){display:none}.g-sh{margin-bottom:20px;padding-top:16px}.g-sh h2{font-size:24px}.g-sh .g-more{font-size:15px}
  .g-svc{grid-template-columns:1fr}.g-svc a{padding:14px 16px;gap:14px;align-items:center}.g-svc-s{display:none}.g-svc-t b{font-size:16.5px}.g-svc-h{align-items:center}.g-svc-h .ic{margin-top:0}.g-svc-t{padding-top:0}.g-ib{width:44px;height:44px}
  .g-news{grid-template-columns:1fr}.g-cards:not(.g-acts) a{flex-direction:column}.g-cards:not(.g-acts) img{width:100%;aspect-ratio:3/2;border-right:0;border-bottom:1px solid var(--line)}.g-acts{grid-template-columns:1fr;gap:0}.g-acts a{flex-direction:row;border:0;border-top:1px solid var(--line);border-radius:0;padding-block:16px;gap:14px}.g-acts li:first-child a{border-top:0;padding-top:0}.g-acts img{width:112px;height:84px;aspect-ratio:auto;border:1px solid var(--line);border-radius:14px;flex-shrink:0}.g-acts .g-card-b{padding:0}.g-news-list a{gap:14px;padding-block:16px}.g-news-list b{font-size:16.5px}
  .g-ann{padding:22px 18px;margin-top:40px}.g-ann ul{grid-template-columns:1fr}.g-ann li:nth-child(4){display:none}.g-ann li:nth-child(2){border-top:1px solid var(--line)}.g-ann li:nth-child(2) a{padding-top:18px}.g-ann-h h3{font-size:21px}
  .g-cards{gap:14px}.g-card-b{padding:12px 12px 16px}.g-card-b b{font-size:16px}.g-sum{display:none}.g-topic{font-size:13px}
  .g-disc-in{padding-block:36px}.g-disc h2{font-size:25px}.g-disc form{grid-template-columns:1fr;padding:16px}
  .g-bottom h2{font-size:22px}.g-contact dl{grid-template-columns:1fr;gap:20px}
  .g-ft-in{grid-template-columns:1fr 1fr;gap:24px;padding-block:32px}.g-ft-in>div{grid-column:1/3}
}`;
const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PROTOTYPE · Homepage G (modern government)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>if(new URLSearchParams(location.search).has("shot"))document.documentElement.classList.add("shot")</script><style>${css}body.noto{font-family:"Noto Sans Thai",system-ui,sans-serif}</style></head><body>${body}<script>if(new URLSearchParams(location.search).get("font")==="noto")document.body.classList.add("noto");for(const f of document.querySelectorAll("form"))f.addEventListener("submit",()=>f.querySelector("button").classList.add("is-loading"));addEventListener("pageshow",()=>document.querySelectorAll(".is-loading").forEach(b=>b.classList.remove("is-loading")))</script></body></html>`;
await writeFile(new URL("home-gov.html", here), html);

// screenshots: full page and first screen at 1440 / 768 / 390
const { chromium } = await import("@playwright/test");
const { mkdir } = await import("node:fs/promises");
await mkdir(new URL("shots/", here), { recursive: true });
const b = await chromium.launch();
for (const [w, n] of [[1440, "d"], [768, "t"], [390, "p"]]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL("home-gov.html", here).href + "?shot", { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	const h = await p.evaluate(() => document.documentElement.scrollHeight);
	const over = await p.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map((e) => e.className));
	await p.screenshot({ path: new URL(`shots/G-${n}.png`, here).pathname, fullPage: true });
	await p.screenshot({ path: new URL(`shots/G-${n}-fold.png`, here).pathname });
	const step = w === 1440 ? 1150 : 1500;
	if (w !== 768) for (let i = 0, y = 0; y < h; i++, y += step) await p.screenshot({ path: new URL(`shots/G-${n}-s${i}.png`, here).pathname, clip: { x: 0, y, width: w, height: Math.min(step, h - y) }, fullPage: true });
	console.log("G", n, w, "height", h, over.length ? "OVERFLOW " + over : "");
	await p.close();
}
{
	const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
	await p.goto(new URL("home-gov.html", here).href, { waitUntil: "networkidle" });
	await p.waitForTimeout(1200);
	await p.screenshot({ path: new URL("shots/G-live-top.png", here).pathname });
	await p.mouse.wheel(0, 1250);
	await p.waitForTimeout(900);
	await p.screenshot({ path: new URL("shots/G-live-mid.png", here).pathname });
	console.log("view-timeline", await p.evaluate(() => CSS.supports("animation-timeline:view()")));
}
await b.close();

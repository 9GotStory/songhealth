// PROTOTYPE (throwaway): Homepage redesign "H · Bold modern" (Product Owner, 2026-11-11: G "ยังดู
// ธรรมดา เรียบง่ายเกินไป", reference https://spss.up.ac.th/default). Same tokens (colour, radius),
// Noto Sans Thai, real content from the dev runtime (data.json, ./img), section order of
// 04-homepage §3 kept in the DOM.
// node .tmp/prototypes/home-redesign/build-bold.mjs  →  .tmp/prototypes/home-redesign/home-bold.html
import { readFile, writeFile, mkdir } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const d = JSON.parse(await readFile(new URL("data.json", here), "utf8"));
const O = "http://127.0.0.1:4324";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const demo = (s) => String(s ?? "").replace(/^\[ตัวอย่าง\]\s*/, "");
const href = (h) => O + h;
const KEEP = /อำเภอสอง|เจ้าหน้าที่|เจ้าพนักงาน|เบาหวาน|สาธารณสุข|ลูกจ้างชั่วคราว|ผู้สูงอายุ|ยุงลาย|ประสบการณ์|ร้องเรียน|ไข้หวัดใหญ่|ความคิดเห็น/g;
const tt = (s) => esc(demo(s)).replace(KEEP, (w) => `<span class="nw">${w}</span>`);
const I = {
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
	up: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
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
	heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
};
const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const serviceIcon = { complaint: "msg", feedback: "bulb", "health-problem": "pulse", "information-request": "file", vhv: "users", "general-inquiry": "help" };
const sIcon = (s) => serviceIcon[Object.keys(serviceIcon).find((k) => s.href.endsWith(k))] ?? "file";
const src = (s) => `img/${String(s).split("/").pop()}`;
const img = (s, cls = "") => `<img class="${cls}" src="${src(s)}" alt="">`;
// a picture, or the plain visual a card shows when it has none (04 §17)
const pic = (s) => (s ? img(s) : `<span class="noimg">${ic("heart", 40)}</span>`);
const day = (s) => { const [dd, ...r] = String(s).split(" "); return { dd, rest: r.join(" ") }; };

const F = d.home.featured;
const fDate = d.news.find((n) => n.href === F.href)?.date;
const news = d.news.filter((n) => n.href !== F.href).slice(0, 5);
// SIMULATED status lines: no Announcement in the runtime has open/close dates, so two rows borrow
// the live labels (AnnouncementStatusLine) to show where they sit.
const simStatus = { 0: ["open", "เปิดอยู่", "วันที่สิ้นสุด 30 พ.ย. 2569"], 3: ["closed", "ปิดแล้ว", "วันที่สิ้นสุด 20 มิ.ย. 2569"] };
const anns = d.announcements.slice(0, 4).map((a, i) => ({ ...a, cat: a.meta[0]?.split("•")[0], st: simStatus[i] }));
// a colour per Announcement category; a category without one keeps the general style
const catClass = { "จัดซื้อจัดจ้าง": "c-blue", "รับสมัครงาน": "c-warm" };
const topics = [...new Set(d.healthList.map((h) => h.meta[0]?.split("•")[0]).filter(Boolean))];
const health = d.healthList.slice(0, 4).map((h) => ({ ...h, topic: h.meta[0]?.split("•")[0], summary: h.meta[1] }));
const acts = d.activities.slice(0, 5);
const contact = Object.fromEntries(d.home.contact.map((c) => [c.k, demo(c.v.replace("เปิดแผนที่(เปิดในแท็บใหม่)", ""))]));
const SITE = "สำนักงานสาธารณสุขอำเภอสอง";
const nav = d.home.nav.slice(0, 7);
// section heading: slashed eyebrow + large title, as the reference does
const sh = (id, eyebrow, title, link, cls = "", icn = "file") => `<div class="sh rv ${cls}"><div class="sh-t"><span class="tile">${ic(icn, 28)}</span><div><p class="eb">${eyebrow}</p><h2 id="${id}">${title}</h2></div></div>${link ? `<a class="btn ghost" href="${href(link)}"><span class="sr">ดู${title}</span>ทั้งหมด ${ic("arrow", 18)}</a>` : ""}</div>`;

// Leadership (GLOSSARY: Personnel with a Leadership order), as /about/leadership shows it today.
// The runtime holds two; the Product Owner asked for three (1 chief + 2 assistants), so the third
// slot is a marked placeholder, not invented content.
const leaders = [
	{ name: "สมชาย ใจดี", pos: "สาธารณสุขอำเภอสอง", img: "01M72F5XZ8MY5MEQBRZWRXTTK0.png", chief: true },
	{ name: "วิภาวดี แสงทอง", pos: "ผู้ช่วยสาธารณสุขอำเภอสอง", img: "01M72F5Y7FSRNECCGVJZA3BDH6.png" },
	{ name: "(ยังไม่มีข้อมูลในระบบ)", pos: "ผู้ช่วยสาธารณสุขอำเภอสอง", img: null },
];
const person = (l) => `<article class="pc${l.chief ? " chief" : ""}"><span class="ph">${l.img ? img(l.img) : ic("users", 36)}</span><span><h3>${esc(l.name)}</h3><p>${esc(l.pos)}</p></span></article>`;
const execStrip = (ls) => `<section class="ex ex-p2" aria-labelledby="s-ex-p2"><div class="wrap"><div class="ex-strip rv" style="--n:${ls.length}">
  <div class="ex-st"><p class="eb">บุคลากร</p><h2 id="s-ex-p2">ผู้บริหาร</h2><a class="rd" href="${O}/about/leadership"><span class="sr">ดูผู้บริหาร</span>ทั้งหมด ${ic("arrow", 16)}</a></div>
  ${ls.map(person).join("")}
</div></div></section>`;

const mk = (E) => `
<a class="skip" href="#main">ข้ามไปยังเนื้อหา</a>
<header class="hd"><div class="wrap hd-in">
  <a class="brand" href="${O}/"><span class="logo">${ic("heart", 22)}</span><span><b>${SITE}</b><small>Song District Public Health Office</small></span></a>
  <nav aria-label="เมนูหลัก">${nav.map((n, i) => `<a href="${href(n.href)}"${i === 0 ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("")}</nav>
  <a class="hs" href="${O}/search" aria-label="ค้นหา">${ic("search", 22)}</a>
  <button class="menu" aria-label="เปิดเมนู" aria-expanded="false">${ic("menu", 24)}</button>
</div></header>

<main id="main">
<div class="top">
  <i class="orb o1"></i><i class="orb o2"></i><i class="ring r1"></i><i class="ring r2"></i><i class="dots"></i>
  <section class="hero wrap${E ? " solo" : ""}" aria-labelledby="h1">
    <div class="hero-t">
      <p class="chip"><i></i>เว็บไซต์ทางการ · กระทรวงสาธารณสุข</p>
      <h1 id="h1" class="sr">${SITE}</h1>
      <p class="hl"><span>ศูนย์กลางข้อมูล บริการ</span> <span>และการประสานงาน<em>ด้านสุขภาพ</em></span> <span>ของประชาชนในอำเภอสอง จังหวัดแพร่</span></p>
      <form class="find" action="${O}/search" role="search"><label class="sr" for="q">ค้นหาในเว็บไซต์</label>${ic("search", 22)}<input id="q" name="q" placeholder="คุณกำลังมองหาอะไร?"><button aria-label="ค้นหา">${ic("arrow", 22)}</button></form>
    </div>
    ${E ? "" : `    <a class="feat" href="${href(F.href)}">
      <i class="feat-bk"></i>
      <span class="feat-card"><span class="feat-img" style="--bg:url('${src(F.img)}')">${img(F.img)}</span>
        <span class="feat-cap"><span><small>เรื่องเด่น · ${esc(fDate)}</small><b>${tt(F.title)}</b></span><span class="go">${ic("up", 20)}</span></span></span>
    </a>`}
  </section>
  <section class="svc wrap" aria-labelledby="s-svc">
    ${sh("s-svc", "บริการ", "บริการประชาชน", "/services", "on-dark", "users")}
    <div class="svc-g${E ? " n4" : ""}">${d.home.services.slice(0, E ? 4 : 6).map((s, i) => `<a class="rv" style="--i:${i}" href="${href(s.href)}"><span class="ico">${ic(sIcon(s), 26)}</span><span><b>${tt(s.title)}</b><small>${esc(s.summary)}</small></span><span class="go">${ic("arrow", 18)}</span></a>`).join("")}</div>
  </section>
</div>

${execStrip(E ? leaders.slice(0, 2) : leaders)}

<section class="news" aria-labelledby="s-news"><div class="wrap">
  ${sh("s-news", "ข่าวสาร", "ข่าวประชาสัมพันธ์", "/news", "", "msg")}
  <div class="news-g">
    <a class="lead rv" href="${href(news[0].href)}">${pic(E ? null : news[0].img)}<span class="ov"><small>${esc(news[0].date)}</small><b>${tt(news[0].title)}</b></span></a>
    ${news.slice(1).map((n, i) => `<a class="nc rv" style="--i:${i}" href="${href(n.href)}"><span class="th">${pic(E && i === 1 ? null : n.img)}</span><span><small>${esc(n.date)}</small><b>${tt(n.title)}</b></span></a>`).join("")}
  </div>
</div></section>

${E ? "" : `<section class="ann" aria-labelledby="s-ann"><i class="blob b1"></i><div class="wrap ann-g">
  <div class="ann-h rv"><div class="sh-t"><span class="tile">${ic("file", 28)}</span><div><p class="eb">แจ้งให้ทราบ</p><h2 id="s-ann">ประกาศ</h2></div></div><p class="sub">ข้อมูลที่อาจมีวันสิ้นสุดหรือการดำเนินการ</p><a class="btn solid" href="${O}/announcements"><span class="sr">ดูประกาศ</span>ทั้งหมด ${ic("arrow", 18)}</a></div>
  <ol class="tl">${anns.map((a, i) => { const t = day(a.date); return `<li class="rv" style="--i:${i}"><a href="${href(a.href)}"><span class="dt"><b>${t.dd}</b><small>${esc(t.rest)}</small></span><span class="tx"><span class="tag ${catClass[a.cat] ?? ""}">${esc(a.cat)}</span><b>${tt(a.title)}</b>${a.st ? `<span class="stl"><span class="st ${a.st[0]}">${a.st[1]}</span>${a.st[2]}</span>` : ""}</span><span class="go">${ic("arrow", 18)}</span></a></li>`; }).join("")}</ol>
</div></section>`}

<section class="hl-sec" aria-labelledby="s-health"><div class="wrap">
  ${sh("s-health", "สุขภาพ", "ความรู้สุขภาพ", "/health/content", "", "pulse")}
  <div class="chips rv" role="group" aria-label="หัวข้อสุขภาพ">${topics.map((t) => `<a href="${O}/health/content?topic=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
  <div class="hc">${health.map((h, i) => `<a class="rv" style="--i:${i}" href="${href(h.href)}"><span class="th">${pic(E && i === 0 ? null : h.img)}</span><span class="tag">${esc(h.topic)}</span><b>${tt(h.title)}</b><small>${esc(h.summary)}</small><span class="rd">อ่านต่อ ${ic("arrow", 16)}</span></a>`).join("")}</div>
</div></section>

<section class="disc-w wrap" aria-labelledby="s-disc"><div class="disc rv">
  <i class="ring r3"></i><i class="dots d2"></i>
  <div><p class="eb">หน่วยบริการ</p><h2 id="s-disc">หน่วยบริการสุขภาพ<br>ใน<span class="nw">อำเภอสอง</span></h2><p class="sub">เลือกตำบลหรือพิมพ์ชื่อ เพื่อดูข้อมูลติดต่อ เวลาเปิดบริการ และแผนที่</p><p class="stats"><span><b>${d.healthServiceCount}</b>หน่วยบริการ</span><span><b>${d.home.areas.length}</b>ตำบล</span></p></div>
  <form action="${O}/health-services"><label for="area">ตำบล</label><select id="area" name="area"><option value="">ทุกตำบล</option>${d.home.areas.map((a) => `<option>${esc(a)}</option>`).join("")}</select><label for="hq">ชื่อหน่วยบริการ</label><input id="hq" name="q" placeholder="เช่น รพ.สต."><button class="btn warm">${ic("search", 18)} ค้นหา</button></form>
</div></section>

<section class="act" aria-labelledby="s-act"><div class="wrap">
  ${sh("s-act", "ภาพกิจกรรม", "กิจกรรม", "/activities", "", "heart")}
  <div class="bento${E ? " eq" : ""}" style="--n:${E ? 3 : 5}">${(E ? acts.slice(0, 3) : acts).map((a, i) => `<a class="rv k${i}" style="--i:${i}" href="${href(a.href)}">${pic(E && i === 1 ? null : a.img)}<span class="ov"><small>${esc(a.date)}</small><b>${tt(a.title)}</b></span></a>`).join("")}</div>
</div></section>

<section class="end wrap">
  <div class="ct rv" aria-labelledby="s-ct"><i class="ring r4"></i><div class="ct-a"><p class="eb">ติดต่อ</p><h2 id="s-ct">ติดต่อสำนักงาน</h2>
    <a class="tel" href="tel:${contact["โทรศัพท์"].replace(/\s/g, "")}">${ic("phone", 26)} ${esc(contact["โทรศัพท์"])}</a></div>
    <div class="ct-b"><p>${ic("pin", 18)} <span>${esc(contact["ที่ตั้ง"])} <a class="map" href="#">เปิดแผนที่ ${ic("up", 14)}</a></span></p><p>${ic("clock", 18)} ${esc(contact["เวลาทำการ"])}</p>
    <a class="btn warm" href="${O}/contact">ข้อมูลติดต่อทั้งหมด ${ic("arrow", 18)}</a></div></div>
</section>
</main>

<footer class="ft"><div class="wrap ft-in">
  <div class="brand"><span class="logo">${ic("heart", 22)}</span><span><b>${SITE}</b><small>จังหวัดแพร่ · กระทรวงสาธารณสุข</small></span></div>
  <div class="ft-c"><b>ช่องทางทางการ</b>${["Facebook", "LINE", "YouTube"].map((c) => `<a href="#" class="soc">${c} ${ic("up", 14)}</a>`).join("")}</div>
  <nav aria-label="ลิงก์ท้ายหน้า"><a href="${O}/pages/privacy">นโยบายความเป็นส่วนตัว</a><a href="${O}/pages/accessibility">การเข้าถึงเว็บไซต์</a><a href="${O}/contact">ติดต่อเรา</a></nav>
</div></footer>`;

const css = `
:root{--brand:#0b6b57;--deep:#123c33;--warm:#f3c95f;--ink:#16211d;--mute:#65736d;--page:#f6f9f7;--base:#fff;--soft:#eaf5f0;--line:#dce7e2;--inp:#7a8a83;--sh:0 10px 15px rgb(13 46 36/.08);--shx:0 30px 60px -20px rgb(13 46 36/.35)}
*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}
body{font-family:"Noto Sans Thai",system-ui,sans-serif;font-size:16px;line-height:26px;color:var(--ink);background:var(--page);overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{display:block;width:100%;height:100%;object-fit:cover}i{font-style:normal}ol{list-style:none;padding:0}
.wrap{max-width:1200px;margin-inline:auto;padding-inline:24px}.nw{white-space:nowrap}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:96px;z-index:99;box-shadow:var(--sh);background:#fff;padding:8px 16px;border-radius:999px}
:focus-visible{outline:3px solid var(--brand);outline-offset:3px}.top :focus-visible,.disc :focus-visible,.ct :focus-visible,.ft :focus-visible{outline-color:var(--warm)}.disc form :focus-visible{outline-color:var(--brand)}
.btn{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 28px;border-radius:999px;font-family:inherit;font-weight:600;font-size:16px;line-height:1;white-space:nowrap;border:0;cursor:pointer;transition:transform .2s,background .2s,box-shadow .2s,color .2s}
.btn .ic{transition:transform .2s}.btn:hover .ic{transform:translateX(4px)}.btn:active{transform:scale(.97)}
.btn.solid{background:var(--brand);color:#fff;box-shadow:0 12px 24px -10px rgb(11 107 87/.7)}.btn.solid:hover{background:var(--deep)}
.btn.ghost{border:1.5px solid var(--line);background:var(--base);color:var(--brand)}.btn.ghost:hover{border-color:var(--brand);background:var(--brand);color:#fff}
.btn.warm{background:var(--warm);color:var(--deep)}.btn.warm:hover{box-shadow:0 12px 28px -8px rgb(243 201 95/.8);transform:translateY(-2px)}
.eb{font-weight:600;font-size:14px;line-height:22px;color:var(--brand);letter-spacing:.02em;margin-bottom:6px}.eb::before,.eb::after{content:"/";margin-inline:0 10px;opacity:.55}.eb::after{margin-inline:10px 0}
h2{font-size:42px;line-height:54px;font-weight:700;letter-spacing:-.01em}
.sh{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:36px}
.sh-t{display:flex;align-items:center;gap:20px}.tile{flex:none;display:grid;place-items:center;width:72px;height:72px;border-radius:22px;background:linear-gradient(140deg,var(--brand),var(--deep));color:var(--warm);box-shadow:0 14px 26px -12px rgb(11 107 87/.7)}.on-dark .tile{background:var(--warm);color:var(--deep);box-shadow:none}
.sub{color:var(--mute);font-size:18px;line-height:30px}
.go{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:999px;background:var(--soft);color:var(--brand);transition:background .2s,color .2s,transform .2s}
a:hover>.go,a:hover .feat-cap .go{background:var(--warm);color:var(--deep);transform:rotate(-0deg) translateX(3px)}

/* header */
.hd{position:sticky;top:0;z-index:50;background:rgb(255 255 255/.86);backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--line),0 8px 24px -16px rgb(13 46 36/.25)}
.hd-in{display:flex;align-items:center;gap:16px;height:84px}
.brand{display:flex;align-items:center;gap:12px;margin-right:auto}.brand{min-width:0}.brand>span:last-child{min-width:0}.brand b{display:block;font-size:clamp(16px,1.3vw,18px);line-height:24px;white-space:nowrap}.brand small{display:block;font-size:13px;line-height:18px;color:var(--mute)}
.logo{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--deep));color:var(--warm)}
.hd nav{display:flex;gap:2px}.hd nav a{padding:8px clamp(8px,.9vw,12px);font-size:clamp(15px,1.15vw,16px);border-radius:999px;font-weight:500;white-space:nowrap;transition:background .2s,color .2s}.hd nav a:hover{background:var(--soft);color:var(--brand)}.hd nav a[aria-current]{background:var(--soft);color:var(--brand);font-weight:600}
.hs{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:999px;background:var(--soft);color:var(--brand);transition:background .2s,color .2s}.hs:hover{background:var(--brand);color:#fff}.menu{display:none;flex:none;width:48px;height:48px;border-radius:14px;border:0;background:var(--soft);color:var(--brand);place-items:center}

/* top: hero + services on one deep field */
.top{position:relative;background:radial-gradient(900px 600px at 85% 0%,#0f8a70 0%,transparent 60%),linear-gradient(140deg,var(--deep) 0%,var(--brand) 70%,var(--deep) 130%);color:#fff;border-radius:0 0 32px 32px;margin-bottom:150px;overflow-x:clip}
.top>i{position:absolute;pointer-events:none}
.orb{border-radius:50%;filter:blur(70px)}.o1{width:420px;height:420px;right:-80px;top:-120px;background:rgb(243 201 95/.38)}.o2{width:360px;height:360px;left:-140px;top:300px;background:rgb(234 245 240/.16)}
.ring{border-radius:50%;border:1.5px solid rgb(255 255 255/.18)}.r1{width:520px;height:520px;right:-170px;top:60px}.r2{width:160px;height:160px;left:46%;top:54px;border-color:rgb(243 201 95/.5)}
.dots{width:180px;height:140px;left:52%;top:500px;opacity:.7;background:radial-gradient(rgb(255 255 255/.28) 1.6px,transparent 2px) 0 0/18px 18px}
.hero{position:relative;display:grid;grid-template-columns:1.35fr .65fr;gap:48px;align-items:center;padding-block:72px 64px}
.chip{display:inline-flex;align-items:center;gap:10px;padding:6px 16px;border-radius:999px;background:rgb(255 255 255/.12);border:1px solid rgb(255 255 255/.22);font-size:14px;line-height:22px;backdrop-filter:blur(6px)}.chip i{width:8px;height:8px;border-radius:50%;background:var(--warm);box-shadow:0 0 0 4px rgb(243 201 95/.3)}
.hl>span{display:block;white-space:nowrap}.hl{margin:22px 0 34px;font-size:clamp(34px,3.3vw,44px);line-height:1.42;font-weight:700;letter-spacing:-.01em}
.hl em{font-style:normal;color:var(--warm);position:relative;white-space:nowrap}.hl em::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:10px;border-radius:999px;background:rgb(243 201 95/.28)}
.find{display:flex;align-items:center;gap:12px;height:68px;max-width:540px;padding:0 8px 0 24px;border-radius:999px;background:#fff;color:var(--mute);box-shadow:var(--shx)}
.hero-t{min-width:0}.find input{flex:1;min-width:0;width:100%;border:0;outline:0;font:inherit;font-size:18px;color:var(--ink);background:none}.find:focus-within{outline:3px solid var(--warm);outline-offset:3px}
.find button{flex:none;display:grid;place-items:center;width:52px;height:52px;border:0;border-radius:999px;background:var(--warm);color:var(--deep);cursor:pointer;transition:transform .2s}.find button:hover{transform:scale(1.08)}
.feat{position:relative;display:block;justify-self:end;width:100%;max-width:400px}
.feat-bk{position:absolute;inset:0;border-radius:24px;background:var(--warm);transform:rotate(6deg) translate(14px,6px);transition:transform .4s cubic-bezier(.2,.7,.2,1)}
.feat-card{position:relative;display:block;border-radius:24px;background:#fff;color:var(--ink);padding:10px;box-shadow:var(--shx);transform:rotate(-2deg);transition:transform .4s cubic-bezier(.2,.7,.2,1)}
.feat:hover .feat-card{transform:rotate(0)}.feat:hover .feat-bk{transform:rotate(9deg) translate(22px,8px)}
.feat-img{position:relative;display:block;height:360px;border-radius:18px;overflow:hidden;background:var(--soft)}
.feat-img::before{content:"";position:absolute;inset:-30px;background:var(--bg) center/cover;filter:blur(26px) saturate(1.2);opacity:.75}
.feat-img img{position:relative;object-fit:contain}
.feat-cap{display:flex;align-items:center;gap:14px;padding:14px 10px 6px}.feat-cap>span:first-child{flex:1}.feat-cap small{display:block;font-size:13px;line-height:20px;color:var(--brand);font-weight:600}.feat-cap b{font-size:18px;line-height:28px}
.svc{position:relative;padding-top:8px}.svc .sh{margin-bottom:28px}
.on-dark .eb{color:var(--warm)}.on-dark .btn.ghost{background:rgb(255 255 255/.1);border-color:rgb(255 255 255/.3);color:#fff}.on-dark .btn.ghost:hover{background:var(--warm);border-color:var(--warm);color:var(--deep)}
.svc-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:-110px}
.svc-g a{position:relative;display:flex;align-items:flex-start;gap:16px;padding:24px;border-radius:22px;background:#fff;color:var(--ink);box-shadow:0 18px 40px -18px rgb(13 46 36/.35);overflow:hidden;transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s,background .3s,color .3s}
.svc-g a::after{content:"";position:absolute;right:-40px;bottom:-40px;width:120px;height:120px;border-radius:50%;background:var(--soft);transition:transform .45s cubic-bezier(.2,.7,.2,1);z-index:0}
.svc-g a>*{position:relative;z-index:1}
.ico{flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:var(--soft);color:var(--brand);transition:background .3s,color .3s,transform .3s}
.svc-g b{display:block;font-size:18px;line-height:28px}.svc-g small{display:block;margin-top:4px;font-size:14px;line-height:22px;color:var(--mute);transition:color .3s}
.svc-g .go{width:36px;height:36px;background:transparent}
@media (hover:hover){.svc-g a:hover{transform:translateY(-8px);background:var(--brand);color:#fff;box-shadow:0 28px 50px -20px rgb(11 107 87/.7)}.svc-g a:hover::after{transform:scale(6);background:var(--brand)}.svc-g a:hover small{color:rgb(255 255 255/.82)}.svc-g a:hover .ico{background:var(--warm);color:var(--deep);transform:rotate(-8deg) scale(1.06)}}

/* news */
.news{padding-block:0 96px}
.news-g{display:grid;grid-template-columns:1.25fr 1fr 1fr;grid-template-rows:auto auto;gap:24px}
.lead{position:relative;grid-row:span 2;min-height:520px;border-radius:24px;overflow:hidden;background:var(--soft);box-shadow:var(--sh)}
.lead>img{position:absolute;inset:0}.lead img,.bento img,.th img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}a:hover>img,a:hover .th img{transform:scale(1.06)}
.ov{position:absolute;inset:auto 0 0 0;padding:90px 26px 24px;color:#fff;background:linear-gradient(to top,rgb(18 60 51/.96) 0%,rgb(18 60 51/.7) 55%,transparent)}
.ov small{display:inline-block;padding:3px 12px;border-radius:999px;background:var(--warm);color:var(--deep);font-size:13px;line-height:20px;font-weight:600;margin-bottom:10px}
.ov b{display:block;font-size:24px;line-height:34px}
.nc{display:flex;flex-direction:column;border-radius:22px;background:var(--base);overflow:hidden;box-shadow:var(--sh);transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
.nc:hover,.hc a:hover{transform:translateY(-6px);box-shadow:0 26px 44px -22px rgb(13 46 36/.4)}
.th{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(100deg,var(--soft) 30%,#f6fbf9 50%,var(--soft) 70%) 0 0/200% 100%}
.nc>span:last-child{padding:16px 20px 20px}.nc small{display:block;font-size:13px;line-height:20px;color:var(--brand);font-weight:600}
.nc b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:17px;line-height:27px;margin-top:2px}

/* announcements: dated timeline */
.ann{position:relative;padding-block:96px;background:var(--soft);overflow:clip}
.blob{position:absolute;border-radius:58% 42% 55% 45%/48% 60% 40% 52%;pointer-events:none}.b1{width:520px;height:480px;left:-160px;top:-60px;background:linear-gradient(140deg,#fff,transparent 70%)}
.ann-g{position:relative;display:grid;grid-template-columns:.8fr 1.6fr;gap:56px;align-items:start}
.ann-h{position:sticky;top:120px}.ann-h .sub{margin:20px 0 28px}
.tl{display:grid;gap:14px}
.tl a{display:flex;align-items:center;gap:22px;padding:18px 22px 18px 18px;border-radius:22px;background:var(--base);box-shadow:var(--sh);transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
.tl a:hover{transform:translateX(10px);box-shadow:0 22px 40px -22px rgb(13 46 36/.4)}
.dt{flex:none;display:grid;place-content:center;text-align:center;width:92px;height:92px;border-radius:18px;background:linear-gradient(140deg,var(--brand),var(--deep));color:#fff}
.dt b{font-size:34px;line-height:38px}.dt small{font-size:13px;line-height:20px;color:var(--warm)}
.tx{flex:1;min-width:0}.tx b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:18px;line-height:28px;margin-top:6px}
.tag{display:inline-block;padding:2px 12px;border-radius:999px;background:var(--soft);color:var(--brand);font-size:13px;line-height:20px;font-weight:600}

.tag.c-warm{background:var(--warm);color:var(--deep)}.tag.c-blue{background:#f0f5fc;color:#1d4f91;box-shadow:inset 0 0 0 1px #c9dbf3}

/* health */
.hl-sec{padding-block:96px}
.hc{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.hc a{display:flex;flex-direction:column;padding:10px 10px 22px;border-radius:22px;background:var(--base);box-shadow:var(--sh);transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
.hc .th{border-radius:14px;aspect-ratio:4/3}.hc .th img{border-radius:14px}.hc a:hover .th img{transform:none}
.hc .tag{position:relative;align-self:flex-start;margin:-13px 0 0 10px;max-width:calc(100% - 20px);background:var(--warm);color:var(--deep);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 14px -6px rgb(13 46 36/.4)}
.hc b{padding:12px 10px 0;font-size:18px;line-height:28px}.hc small{padding:6px 10px 0;font-size:14px;line-height:22px;color:var(--mute);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rd{display:inline-flex;align-items:center;gap:6px;margin-top:auto;padding:14px 10px 0;font-size:14px;font-weight:600;color:var(--brand)}.rd .ic{transition:transform .2s}a:hover .rd .ic{transform:translateX(4px)}

/* discovery band */
.disc{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center;padding:56px;border-radius:32px;color:#fff;background:radial-gradient(600px 400px at 0% 100%,#0f8a70,transparent 65%),linear-gradient(120deg,var(--brand),var(--deep));overflow:hidden;box-shadow:var(--shx)}
.disc>i{position:absolute;pointer-events:none}.r3{width:340px;height:340px;right:-90px;top:-150px;border-color:rgb(243 201 95/.45)}.d2{left:auto;right:46%;top:auto;bottom:22px;width:120px;height:90px}
.disc .eb{color:var(--warm)}.disc .sub{color:rgb(255 255 255/.85);margin-top:12px}
.disc form{position:relative;display:grid;gap:8px;padding:28px;border-radius:24px;background:#fff;color:var(--ink);box-shadow:var(--shx)}
label{font-size:14px;line-height:22px;font-weight:600}
select,.disc input{height:52px;padding:0 16px;margin-bottom:8px;border:1.5px solid var(--inp);border-radius:14px;font:inherit;color:var(--ink);background:#fff;transition:border-color .2s,box-shadow .2s}
select:focus,.disc input:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 4px rgb(11 107 87/.18)}
.disc form .btn{justify-content:center;margin-top:6px}
.btn.is-loading{pointer-events:none;opacity:.85}.btn.is-loading .ic{animation:spin .8s linear infinite;border:2.5px solid currentColor;border-right-color:transparent;border-radius:50%}.btn.is-loading .ic *{display:none}

/* activities bento */
.act{padding-block:96px}
.bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:230px;gap:20px}
.bento a{position:relative;border-radius:22px;overflow:hidden;background:var(--soft);box-shadow:var(--sh)}
.bento .k0{grid-column:3/span 2;grid-row:1/span 2}
.bento .ov{padding:70px 20px 18px}.bento .ov b{font-size:17px;line-height:26px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.bento .k0 .ov b{font-size:24px;line-height:34px}

/* leadership strip, before News */
.ex-p2{padding-bottom:64px}
.pc{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;padding:32px 24px;border-radius:24px;background:var(--base);box-shadow:var(--sh)}
.pc h3{font-size:20px;line-height:30px;font-weight:700}.pc p{color:var(--mute);font-size:16px;line-height:26px}
.ph{flex:none;display:grid;place-items:center;width:120px;height:120px;border-radius:50%;overflow:hidden;background:var(--soft);color:var(--brand);box-shadow:0 0 0 4px #fff,0 0 0 6px var(--line)}.ph img{object-position:top}
.ex-strip{display:grid;grid-template-columns:auto repeat(var(--n),1fr);gap:12px 28px;align-items:center;padding:24px 32px;border-radius:24px;background:var(--base);box-shadow:var(--sh)}
.ex-st{padding-right:28px;border-right:1.5px solid var(--line)}.ex-st h2{font-size:28px;line-height:38px}.ex-st .rd{padding:6px 0 0}
.ex-strip .pc{flex-direction:row;text-align:left;padding:0;gap:16px;background:none;box-shadow:none;border-radius:0}
.ex-strip .ph{width:76px;height:76px}.ex-strip .ph .ic{width:28px;height:28px}.ex-strip .chief .ph{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--warm)}
.ex-strip h3{font-size:17px;line-height:26px}.ex-strip p{font-size:14px;line-height:22px}.ex-strip .chief p{color:var(--brand);font-weight:600}


.bento.eq{grid-template-columns:repeat(var(--n),1fr);grid-auto-rows:300px}.bento.eq .k0{grid-column:auto;grid-row:auto}.bento.eq .k0 .ov b{font-size:17px;line-height:26px}.bento.eq .noimg .ic{width:40px;height:40px}
.news+.hl-sec{padding-top:0}

/* quick access + contact */
.end{padding-bottom:96px}
.end h2{font-size:34px;line-height:46px}
.qa{display:flex;flex-direction:column;padding:40px;border-radius:24px;background:var(--base);box-shadow:var(--sh)}
.qa-g{flex:1;display:grid;grid-auto-rows:1fr;gap:14px;margin-top:24px}
.qa-g a{display:flex;align-items:center;gap:16px;padding:16px;border-radius:20px;border:1.5px solid var(--line);font-size:18px;transition:border-color .2s,background .2s,transform .3s}.qa-g a b{flex:1}
.qa-g a:hover{border-color:var(--brand);background:var(--soft);transform:translateX(6px)}
.ct{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:24px 56px;align-items:center;padding:48px 56px;border-radius:24px;color:#fff;background:linear-gradient(140deg,var(--deep),var(--brand));overflow:hidden;box-shadow:var(--shx)}
.ct .eb{color:var(--warm)}.ct>i{position:absolute}.r4{width:260px;height:260px;right:-80px;bottom:-110px;border-color:rgb(243 201 95/.45)}
.tel{display:inline-flex;align-items:center;gap:12px;margin:12px 0 0;white-space:nowrap;font-size:40px;line-height:52px;font-weight:700;color:var(--warm)}
.ct p:not(.eb){display:flex;gap:10px;align-items:flex-start;color:rgb(255 255 255/.9);margin-bottom:8px}.ct p:not(.eb) .ic{flex:none;margin-top:4px;color:var(--warm)}.ct .btn{margin-top:18px}

.ft{background:var(--deep);color:#fff;border-radius:32px 32px 0 0}
.ft-in{display:flex;align-items:center;gap:32px;padding-block:36px;flex-wrap:wrap}.ft .brand small{color:rgb(255 255 255/.7)}.ft .logo{background:var(--warm);color:var(--deep)}
.ft .brand{margin-right:auto}.ft-c{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ft-c b{font-size:14px;color:rgb(255 255 255/.7);font-weight:500;margin-right:4px}.soc{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.2);font-size:14px;line-height:22px;transition:background .2s,color .2s}.soc:hover{background:var(--warm);color:var(--deep)}.ft-in>nav{flex-basis:100%;padding-top:20px;border-top:1px solid rgb(255 255 255/.14);font-size:14px}
.ft nav{display:flex;gap:8px 28px;flex-wrap:wrap}.ft nav a{color:rgb(255 255 255/.85);border-bottom:1px solid transparent;transition:color .2s,border-color .2s}.ft nav a:hover{color:var(--warm);border-color:var(--warm)}

/* states */
.noimg{position:absolute;inset:0;display:grid;place-items:center;color:rgb(11 107 87/.28);background:radial-gradient(circle at 80% 10%,#fff 0,transparent 55%),linear-gradient(140deg,var(--soft),#d6ece2)}
.lead .noimg,.bento .noimg{color:rgb(255 255 255/.2);background:radial-gradient(420px 300px at 85% 0%,#0f8a70,transparent 65%),linear-gradient(140deg,var(--brand),var(--deep))}.lead .noimg .ic,.bento .k0 .noimg .ic{width:120px;height:120px}
.hero.solo{grid-template-columns:1fr;padding-block:88px 72px}.solo .hl{font-size:52px;line-height:74px}.solo .find{max-width:640px}
.svc-g.n4{grid-template-columns:1fr 1fr}
.stl{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:6px;font-size:13px;line-height:20px;color:var(--mute)}
.st{display:inline-flex;align-items:center;gap:6px;padding:1px 10px;border-radius:999px;font-weight:600}.st::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.st.open{background:var(--brand);color:#fff}.st.closed{background:#e7ecea;color:var(--ink)}.st.upcoming{background:var(--warm);color:var(--deep)}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:-12px 0 28px}.chips a{padding:6px 16px;border-radius:999px;border:1.5px solid var(--line);background:var(--base);font-size:14px;line-height:22px;font-weight:500;color:var(--brand);transition:background .2s,color .2s,border-color .2s}.chips a:hover{background:var(--brand);border-color:var(--brand);color:#fff}
.stats{display:flex;gap:36px;margin-top:24px}.stats span{display:flex;align-items:baseline;gap:10px;color:rgb(255 255 255/.85)}.stats b{font-size:44px;line-height:52px;color:var(--warm)}
.map{display:inline-flex;align-items:center;gap:4px;color:var(--warm);font-weight:600;white-space:nowrap;border-bottom:1px solid currentColor;line-height:24px}

/* motion */
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:no-preference){
  @keyframes up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
  @keyframes pop{from{opacity:0;transform:rotate(-10deg) translateY(40px) scale(.92)}to{opacity:1;transform:rotate(-2deg)}}
  @keyframes popbk{from{opacity:0;transform:rotate(0)}to{opacity:1;transform:rotate(6deg) translate(14px,6px)}}
  @keyframes drift{from{transform:translate(0,0)}to{transform:translate(30px,-36px)}}
  @keyframes turn{to{transform:rotate(360deg)}}
  @keyframes shim{to{background-position:-200% 0}}
  .hero-t>*{animation:up .8s cubic-bezier(.2,.7,.2,1) both}.hero-t>:nth-child(3){animation-delay:.1s}.hero-t>:nth-child(4){animation-delay:.22s}
  .feat-card{animation:pop .9s .25s cubic-bezier(.2,.7,.2,1) both}.feat-bk{animation:popbk .9s .45s cubic-bezier(.2,.7,.2,1) both}
  .orb{animation:drift 9s ease-in-out infinite alternate}.o2{animation-duration:13s;animation-direction:alternate-reverse}
  .r2,.r3,.r4{border-style:dashed;animation:turn 40s linear infinite}
  .th{animation:shim 1.6s linear infinite}
  @supports (animation-timeline:view()){
    .rv{animation:up linear both;animation-timeline:view();animation-range:entry 0% entry 60%}
    .svc-g .rv{animation-range:entry 0% entry 90%}
  }
}
.shot *,.shot *::before,.shot *::after{animation:none!important}

@media (max-width:1023.98px){
  .hd nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 20px;background:#fff;border-radius:0 0 24px 24px;box-shadow:0 30px 40px -20px rgb(13 46 36/.35)}.hd.open nav{display:grid}.hd nav a{display:flex;align-items:center;justify-content:space-between;padding:14px 12px;font-size:18px;border-radius:14px;font-size:18px;border-bottom:1px solid var(--line)}.hd nav a:last-child{border:0}.hd nav a::after{content:"›";color:var(--brand);font-size:22px}.menu{display:grid;cursor:pointer}.hd.open .menu{background:var(--brand);color:#fff}
  .hero{grid-template-columns:1fr .8fr;gap:32px;padding-block:48px}.hl{font-size:34px;line-height:48px}.hl>span{display:inline;white-space:normal}
  .svc-g{grid-template-columns:1fr 1fr}.news-g{grid-template-columns:1fr 1fr}.lead{grid-column:span 2;grid-row:auto;min-height:380px}
  .ann-g{grid-template-columns:1fr;gap:28px}.ann-h{position:static;display:grid;grid-template-columns:1fr auto;align-items:center;gap:0 16px}.ann-h .sub{grid-row:2;grid-column:span 2;margin:12px 0 0}.hc{grid-template-columns:1fr 1fr}
  .disc{grid-template-columns:1fr;padding:40px}.ct{grid-template-columns:1fr;padding:40px}.bento,.bento.eq{grid-template-columns:1fr 1fr}.bento .k0,.bento.eq .k0{grid-column:1/span 2}
  h2{font-size:36px;line-height:48px}
  .solo .hl{font-size:38px;line-height:54px}
  .ex-strip{grid-template-columns:1fr 1fr;padding:24px}.ex-st{grid-column:span 2;display:flex;align-items:baseline;gap:16px;padding:0 0 12px;border-right:0;border-bottom:1.5px solid var(--line)}.ex-st .eb{display:none}.ex-st .rd{margin-left:auto}.ex-strip .chief{grid-column:span 2}
  .news{padding-bottom:72px}.ann,.hl-sec,.act{padding-block:72px}.end{padding-bottom:72px}.hc .th{aspect-ratio:16/9}.bento{grid-auto-rows:200px}.dots{display:none}
}
@media (max-width:639.98px){
  .ex-p2{padding:40px 0 0}.pc h3{font-size:16px;line-height:24px}.pc p{font-size:14px;line-height:22px}.ex-strip{grid-template-columns:1fr;padding:20px;gap:18px}.ex-st,.ex-strip .chief{grid-column:auto}.ex-strip .ph{width:60px;height:60px}
  .tile{width:52px;height:52px;border-radius:16px}.tile .ic{width:22px;height:22px}.sh-t{gap:14px}.wrap{padding-inline:16px}.hd-in{height:auto;min-height:68px;padding-block:10px;gap:10px}.brand b{font-size:16px;line-height:22px;white-space:normal}.brand small{display:none}.logo{width:42px;height:42px}
  .top{border-radius:0 0 24px 24px;margin-bottom:0}.r1,.dots{display:none}
  .hero{grid-template-columns:1fr;padding-block:32px 40px;gap:36px}.hl{font-size:29px;line-height:42px;margin:16px 0 24px}
  .find{height:60px}.find button{width:44px;height:44px}.find input{font-size:16px}
  .feat{max-width:340px;justify-self:center}.feat-img{height:260px}
  h2{font-size:26px;line-height:38px}.sh-t{min-width:0}.sh{margin-bottom:24px;align-items:center}.sub{font-size:16px;line-height:26px}
  .sh .btn,.ann-h .btn{flex:none;width:44px;height:44px;padding:0;justify-content:center;font-size:0;gap:0}
  .svc{padding-bottom:40px}.svc-g{grid-template-columns:1fr;gap:12px;margin-bottom:0}.svc-g a{padding:16px;align-items:center}.svc-g small{display:none}.ico{width:48px;height:48px;border-radius:14px}
  .chips{gap:8px;margin:-6px 0 18px}.chips a{padding:4px 12px;font-size:13px}.stats{gap:24px;margin-top:16px}.stats b{font-size:34px;line-height:42px}.solo .hl{font-size:29px;line-height:42px}.hero.solo{padding-block:36px 40px}.svc-g.n4{grid-template-columns:1fr}.news{padding-block:44px}.news-g{grid-template-columns:1fr;gap:14px}.lead{grid-column:auto;min-height:300px}.ov b{font-size:20px;line-height:30px}
  .nc{flex-direction:row;align-items:center}.nc .th{flex:none;width:120px;aspect-ratio:4/3;margin:10px;border-radius:14px}.nc>span:last-child{padding:10px 14px 10px 4px}.nc b{font-size:16px;line-height:24px}.nc:nth-child(n+5){display:none}
  .ann,.hl-sec,.act{padding-block:44px}.ann-g{gap:24px}.tl a{gap:14px;padding:12px}.dt{width:68px;height:68px;border-radius:14px}.dt b{font-size:24px;line-height:28px}.dt small{font-size:11px;line-height:16px}.tx b{font-size:16px;line-height:24px}.tl .go{display:none}.tl li:nth-child(n+4){display:none}
  .hc{grid-template-columns:1fr;gap:12px}.hc a{display:grid;grid-template-columns:112px 1fr;grid-template-rows:auto 1fr;gap:4px 14px;padding:10px;align-items:start}.hc .th{grid-row:span 2;align-self:center;aspect-ratio:4/3}.hc .tag{margin:4px 0 0;align-self:end;justify-self:start;max-width:100%}.hc b{padding:0 4px 0 0;font-size:16px;line-height:24px}.hc small,.hc .rd{display:none}
  .disc{padding:28px 20px;border-radius:24px;gap:24px}.disc form{padding:20px}
  .bento{grid-template-columns:1fr 1fr;grid-auto-rows:170px;gap:12px}.bento .ov{padding:40px 12px 10px}.bento .ov b{font-size:14px;line-height:21px}.bento .k0 .ov b{font-size:18px;line-height:27px}.bento a:not(.k0) small{display:none}
  .end{padding-bottom:44px}.ct{padding:24px}.end h2{font-size:26px;line-height:38px}.tel{font-size:32px;line-height:44px}
  .ft{border-radius:24px 24px 0 0}
}`;

const page = (body) => `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PROTOTYPE H · ${SITE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>if(new URLSearchParams(location.search).has("shot"))document.documentElement.classList.add("shot")</script><style>${css}</style></head><body>${body}

<script>{const m=document.querySelector(".menu"),h=document.querySelector(".hd");m.addEventListener("click",()=>m.setAttribute("aria-expanded",h.classList.toggle("open")))}for(const f of document.querySelectorAll("form"))f.addEventListener("submit",()=>f.querySelector("button").classList.add("is-loading"));addEventListener("pageshow",()=>document.querySelectorAll(".is-loading").forEach(b=>b.classList.remove("is-loading")))</script></body></html>`;
await writeFile(new URL("home-bold.html", here), page(mk(false)));
// the same page with content missing: no Featured, no current Announcement, 4 Services, 2 Leadership, pictures absent
await writeFile(new URL("home-bold-empty.html", here), page(mk(true)));

const { chromium } = await import("@playwright/test");
await mkdir(new URL("shots/", here), { recursive: true });
const b = await chromium.launch();
for (const [w, n] of [[1440, "d"], [768, "t"], [390, "p"]]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	const h = await p.evaluate(() => document.documentElement.scrollHeight);
	const over = await p.evaluate(() => [...document.querySelectorAll("main *:not(i)")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map((e) => e.className));
	await p.screenshot({ path: new URL(`shots/H-${n}.png`, here).pathname, fullPage: true });
	const step = w === 1440 ? 1150 : 1500;
	for (let i = 0, y = 0; y < h; i++, y += step) await p.screenshot({ path: new URL(`shots/H-${n}-s${i}.png`, here).pathname, clip: { x: 0, y, width: w, height: Math.min(step, h - y) }, fullPage: true });
	console.log("H", n, w, "height", h, over.length ? "OVERFLOW " + over : "");
	await p.close();
}
{
	const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
	await p.goto(new URL("home-bold.html", here).href, { waitUntil: "networkidle" });
	await p.waitForTimeout(1800);
	const shot = (n) => p.screenshot({ path: new URL(`shots/H-live-${n}.png`, here).pathname });
	await shot("top");
	await p.hover(".svc-g a:nth-child(2)"); await p.waitForTimeout(600); await shot("svc-hover");
	await p.hover(".feat"); await p.waitForTimeout(600); await shot("feat-hover");
	for (const [n, sel] of [["ann", ".ann"], ["health", ".hl-sec"], ["act", ".act"]]) {
		await p.evaluate((s) => scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 100), sel);
		await p.waitForTimeout(900);
		if (n === "ann") { await p.mouse.wheel(0, 260); await p.waitForTimeout(600); await p.hover(".tl li:nth-child(2) a"); await p.waitForTimeout(500); }
		if (n === "health") { await p.hover(".hc a:nth-child(2)"); await p.waitForTimeout(500); }
		await shot(n);
	}
	const hidden = await p.evaluate(() => [...document.querySelectorAll(".rv")].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > 0 && getComputedStyle(e).opacity < 0.99; }).length);
	console.log("view-timeline", await p.evaluate(() => CSS.supports("animation-timeline:view()")), "half-hidden in view", hidden);
}
for (const [w, n] of [[1440, "d"], [390, "p"]]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL("home-bold-empty.html", here).href + "?shot", { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	const h = await p.evaluate(() => document.documentElement.scrollHeight);
	const step = w === 1440 ? 1150 : 1500;
	for (let i = 0, y = 0; y < h; i++, y += step) await p.screenshot({ path: new URL(`shots/H-empty-${n}-s${i}.png`, here).pathname, clip: { x: 0, y, width: w, height: Math.min(step, h - y) }, fullPage: true });
	console.log("H empty", n, "height", h);
	if (n === "p") {
		await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
		await p.click(".menu"); await p.waitForTimeout(300);
		await p.screenshot({ path: new URL("shots/H-menu-p.png", here).pathname });
	}
	await p.close();
}
await b.close();

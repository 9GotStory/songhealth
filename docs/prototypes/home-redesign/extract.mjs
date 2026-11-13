// PROTOTYPE (throwaway): read the public pages of the dev runtime into data.json for the
// homepage-redesign prototype. Read-only GETs with the tests' referrer.
// node .tmp/prototypes/home-redesign/extract.mjs
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const O = "http://127.0.0.1:4324";
const b = await chromium.launch();
const ctx = await b.newContext({ extraHTTPHeaders: { Referer: "http://songhealth-unknown-referrer.invalid/" } });
const p = await ctx.newPage();
const media = (src) => { if (!src) return null; const u = new URL(src, O); return u.searchParams.get("href") ?? u.href; };
await p.goto(O + "/");
const home = await p.evaluate(() => {
  const t = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? null;
  const sec = (id) => document.querySelector(`section[aria-labelledby="${id}"]`);
  const f = sec("home-featured");
  return {
    featured: f && { title: t(f.querySelector("h2")), eyebrow: t(f.querySelector("p")), lead: [...f.querySelectorAll("p")].map(t), img: f.querySelector("img")?.getAttribute("src"), href: f.querySelector("a")?.getAttribute("href") },
    services: [...(sec("home-services")?.querySelectorAll("li") ?? [])].map((li) => ({ title: t(li.querySelector("h3")), summary: t(li.querySelector("p")), href: li.querySelector("a").getAttribute("href") })),
    health: [...(sec("home-health")?.querySelectorAll("li") ?? [])].map((li) => ({ topic: t(li.querySelector("p.text-label")), title: t(li.querySelector("h3")), summary: t(li.querySelector("p.line-clamp-3")), href: li.querySelector("a").getAttribute("href") })),
    healthAll: sec("home-health")?.querySelector(":scope > div > a")?.getAttribute("href"),
    areas: [...document.querySelectorAll("#discovery-area option")].map((o) => o.textContent.trim()).slice(1),
    quick: [...(sec("home-quick-access")?.querySelectorAll("a") ?? [])].map((a) => ({ label: t(a), href: a.getAttribute("href") })),
    contact: [...sec("home-contact").querySelectorAll("dt")].map((dt) => ({ k: t(dt), v: t(dt.nextElementSibling) })),
    nav: [...document.querySelectorAll("header nav a")].map((a) => ({ label: t(a), href: a.getAttribute("href") })),
    footer: t(document.querySelector("footer")),
  };
});
home.featured && (home.featured.img = home.featured.img);
const list = async (path, n) => { await p.goto(O + path); return p.evaluate((n) => [...document.querySelectorAll("main article, main li")].filter((e) => e.querySelector("h2")).map((e) => ({
  title: e.querySelector("h2").textContent.replace(/\s+/g, " ").trim(),
  date: e.querySelector("time")?.textContent.trim() ?? null,
  meta: [...e.querySelectorAll("p")].map((x) => x.textContent.replace(/\s+/g, " ").trim()).filter(Boolean),
  img: e.querySelector("img")?.getAttribute("src") ?? null,
  href: e.querySelector("a[href]:not([href='/'])")?.getAttribute("href") ?? null,
})).filter((x, i, a) => a.findIndex((y) => y.href === x.href) === i).slice(0, n), n); };
const data = { home, news: await list("/news", 6), announcements: await list("/announcements", 5), activities: await list("/activities", 5) };
if (home.healthAll) data.healthList = await list(home.healthAll, 6);
await p.goto(O + "/health-services"); data.healthServiceCount = await p.evaluate(() => document.querySelectorAll("main h2, main h3").length);
data.healthServiceSample = await p.evaluate(() => [...document.querySelectorAll("main li")].slice(0,4).map((li) => li.textContent.replace(/\s+/g, " ").trim().slice(0,160)));
for (const k of ["news", "activities", "healthList"]) for (const x of data[k] ?? []) x.img = media(x.img);
home.featured && (home.featured.img = media(home.featured.img));
await writeFile(new URL("./data.json", import.meta.url), JSON.stringify(data, null, 1));
console.log(JSON.stringify({news:data.news.map(x=>x.title+" | "+x.date+" | "+!!x.img), ann:data.announcements.map(x=>x.meta[0]+" | "+x.title), act:data.activities.map(x=>x.date+" "+x.title), health:data.healthList?.map(x=>x.title+" | "+!!x.img+" | "+x.meta.join(" / ")), hs:data.healthServiceCount, hss:data.healthServiceSample}, null, 1));
await b.close();

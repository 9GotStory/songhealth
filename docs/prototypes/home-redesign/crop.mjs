import { chromium } from "@playwright/test";
const [v, w, y, h, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 900 } });
await p.goto(new URL(`./home-redesign.html?variant=${v}&shot`, import.meta.url).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: new URL(`./shots/${out}.png`, import.meta.url).pathname, clip: { x: 0, y: +y, width: +w, height: +h }, fullPage: true });
const m = await p.evaluate(() => [...document.querySelectorAll("main section, main > div")].map(s => `${s.getAttribute("aria-labelledby") || s.className} y=${Math.round(s.getBoundingClientRect().top + scrollY)} h=${Math.round(s.getBoundingClientRect().height)}`));
console.log(m.join("\n"));
await b.close();

import { chromium } from "@playwright/test";
const here = new URL("./", import.meta.url);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
// keep the page from navigating so the loading state stays on screen
await p.evaluate(() => { const f = document.querySelector(".disc form"); f.addEventListener("submit", (e) => e.preventDefault()); f.scrollIntoView({ block: "center" }); });
await p.click(".disc form button"); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const e = document.querySelector(".disc").getBoundingClientRect(); return { x: 0, y: e.top, width: innerWidth, height: e.height }; });
await p.screenshot({ path: new URL("shots/H-loading.png", here).pathname, clip: r });
console.log("is-loading", await p.evaluate(() => document.querySelector(".disc form button").className));
// keyboard focus ring
await p.evaluate(() => scrollTo(0, 0)); await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); await p.keyboard.press("Tab");
await p.screenshot({ path: new URL("shots/H-focus.png", here).pathname, clip: { x: 0, y: 0, width: 1440, height: 130 } });
console.log("focused", await p.evaluate(() => document.activeElement.textContent.trim().slice(0, 30)));
await b.close();

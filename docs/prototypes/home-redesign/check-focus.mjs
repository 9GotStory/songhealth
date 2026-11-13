import { chromium } from "@playwright/test";
const here = new URL("./", import.meta.url);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
const seen = [];
for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); seen.push(await p.evaluate(() => (document.activeElement.getAttribute("aria-label") || document.activeElement.textContent || document.activeElement.id).trim().slice(0, 22))); if (i === 0) await p.screenshot({ path: new URL("shots/H-focus-skip.png", here).pathname, clip: { x: 0, y: 0, width: 600, height: 110 } }); if (i === 3) await p.screenshot({ path: new URL("shots/H-focus.png", here).pathname, clip: { x: 0, y: 0, width: 1440, height: 110 } }); }
console.log(seen.join(" → "));
await b.close();

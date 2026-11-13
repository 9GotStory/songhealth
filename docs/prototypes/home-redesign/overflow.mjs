import { chromium } from "@playwright/test";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 900 } });
await p.goto(new URL("./home-redesign.html?variant=" + process.argv[2] + "&shot", import.meta.url).href, { waitUntil: "networkidle" });
console.log(await p.evaluate(() => [...document.querySelectorAll("main *")].filter(e => e.getBoundingClientRect().right > 391).slice(0, 6).map(e => `${e.tagName}.${e.className} r=${Math.round(e.getBoundingClientRect().right)}`).join("\n")));
await b.close();

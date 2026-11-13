import { chromium } from "@playwright/test";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 900 } });
await p.goto(new URL("./home-redesign.html?variant=" + process.argv[2] + "&shot", import.meta.url).href);
console.log(await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0,3).map(e => { const cs = getComputedStyle(e); return `${e.className} ${cs.display} ${cs.gridTemplateColumns} ${cs.flexWrap} ${cs.whiteSpace} w=${e.getBoundingClientRect().width} h=${e.getBoundingClientRect().height}`; }).join("\n"), process.argv[3]));
await b.close();

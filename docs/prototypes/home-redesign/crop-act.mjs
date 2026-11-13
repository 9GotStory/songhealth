import { chromium } from "@playwright/test";
const here = new URL("./", import.meta.url);
const b = await chromium.launch();
for (const [w, n] of [[1440, "d"], [390, "p"]]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
	const r = await p.evaluate(() => { const e = document.querySelector(".act").getBoundingClientRect(); return { y: e.top + scrollY, h: e.height }; });
	await p.screenshot({ path: new URL(`shots/H-act-${n}.png`, here).pathname, clip: { x: 0, y: r.y, width: w, height: r.h }, fullPage: true });
}
await b.close();

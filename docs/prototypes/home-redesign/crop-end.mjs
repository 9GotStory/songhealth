import { chromium } from "@playwright/test";
const here = new URL("./", import.meta.url);
const b = await chromium.launch();
for (const [w, n] of [[1440, "d"], [390, "p"]]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL("home-bold.html", here).href + "?shot", { waitUntil: "networkidle" });
	const y = await p.evaluate(() => document.querySelector(".end").getBoundingClientRect().top + scrollY - 40);
	await p.screenshot({ path: new URL(`shots/H-end-${n}.png`, here).pathname, clip: { x: 0, y, width: w, height: w === 390 ? 760 : 520 }, fullPage: true });
	if (n === "d") await p.screenshot({ path: new URL("shots/H-head-d.png", here).pathname, clip: { x: 0, y: 0, width: w, height: 120 } });
}
await b.close();

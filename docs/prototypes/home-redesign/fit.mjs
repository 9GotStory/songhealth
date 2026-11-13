// overflow and header fit at each breakpoint's edges (memory: spec fit at the tightest width)
import { chromium } from "@playwright/test";
const here = new URL("./", import.meta.url);
const b = await chromium.launch();
for (const f of ["home-bold.html", "home-bold-empty.html"]) for (const w of [1440, 1280, 1024, 1023, 768, 640, 639, 390, 375, 320]) {
	const p = await b.newPage({ viewport: { width: w, height: 900 } });
	await p.goto(new URL(f, here).href + "?shot", { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	const r = await p.evaluate(() => {
		const over = [...document.querySelectorAll("header *,main *:not(i),footer *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1); }).slice(0, 4).map((e) => e.className || e.tagName);
		const hd = document.querySelector(".hd-in").getBoundingClientRect();
		const kids = [...document.querySelector(".hd-in").children].filter((e) => e.getBoundingClientRect().width > 0).map((e) => Math.round(e.getBoundingClientRect().height));
		const small = [...document.querySelectorAll("a,button,select,input")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 24; }).length;
		const sm = [...document.querySelectorAll("a,button,select,input")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 24; }).map((e) => (e.className || e.textContent.trim().slice(0, 12)) + ":" + Math.round(e.getBoundingClientRect().height));
		return { sm, h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, hdH: Math.round(hd.height), kids, over, small };
	});
	console.log(f.replace("home-bold", "H").replace(".html", ""), w, JSON.stringify(r));
	if (f === "home-bold.html" && [1024, 320].includes(w)) await p.screenshot({ path: new URL(`shots/H-fit-${w}.png`, here).pathname, clip: { x: 0, y: 0, width: w, height: w === 320 ? 1500 : 1000 }, fullPage: true });
	await p.close();
}
await b.close();

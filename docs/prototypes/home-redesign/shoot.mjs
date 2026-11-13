// PROTOTYPE: screenshot each variant at 1440/768/390 into ./shots, and report page heights.
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const dir = new URL("./shots/", import.meta.url).pathname; await mkdir(dir, { recursive: true });
const file = new URL("./home-redesign.html", import.meta.url).href;
const b = await chromium.launch();
for (const v of (process.argv[2] ?? "A,B,C").split(","))
  for (const [w, n] of [[1440, "d"], [768, "t"], [390, "p"]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(`${file}?variant=${v}&shot`, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await p.screenshot({ path: `${dir}${v}-${n}.png`, fullPage: true });
    await p.screenshot({ path: `${dir}${v}-${n}-fold.png` });
    console.log(v, n, w, "height", h, overflow ? "H-OVERFLOW" : "");
    await p.close();
  }
await b.close();

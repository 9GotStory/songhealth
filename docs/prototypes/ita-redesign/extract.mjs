// PROTOTYPE (throwaway), Feature 013: the content and the shell the builder reads.
// node .tmp/prototypes/ita-redesign/extract.mjs  →  data.json, shell.json
//
// The content is the demo dataset's two MOITs of fiscal year 2570, read from the development
// runtime's public pages with GET requests, as the pages render them: each MOIT's header, its
// Requirements with their counts, and its Evidence pills as HTML, which keep their look (grill
// Q4). The shell is the runtime's own header, with the ITA section marked, and its footer.
// Nothing here comes from the Legacy site.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const SLUGS = ["demo-moit-1-2570", "demo-moit-2-2570"];
const clean = (html) =>
	html
		.replace(/ data-astro-[a-z-]+="[^"]*"/g, "")
		.replace(/ data-astro-[a-z-]+(?=[ >])/g, "")
		.replace(/(href|src|action)="\//g, `$1="${ORIGIN}/`);

const browser = await chromium.launch();
const page = await browser.newPage();
const moits = [];
for (const slug of SLUGS) {
	await page.goto(`${ORIGIN}/ita/${slug}`, { waitUntil: "domcontentloaded" });
	const moit = await page.evaluate(() => {
		const article = document.querySelector("main article");
		const header = article.querySelector("header");
		const h1 = header.querySelector("h1");
		const label = h1.querySelector("span").textContent.trim();
		const details = [...article.querySelectorAll('details[id^="requirement-"]')];
		const toc = [...article.querySelectorAll('nav[aria-label="สารบัญข้อกำหนด"] li a')];
		const firstList = details[0]
			? details[0].parentElement.firstElementChild
			: article.querySelector(":scope > ul");
		return {
			yearTitle: header.querySelector("p").textContent.trim(),
			number: Number(label.replace("MOIT ", "")),
			title: h1.textContent.replace(label, "").trim(),
			summary: header.querySelector("p.max-w-3xl")?.textContent ?? null,
			countsHtml: [...header.querySelectorAll(":scope > p")].at(-1).innerHTML.trim(),
			leadHtml: firstList?.tagName === "UL" ? firstList.outerHTML : "",
			cards: details.map((d, i) => {
				const [number, title, count] = toc[i].querySelectorAll(":scope > span");
				return {
					number: number.textContent.trim() === "–" ? "" : number.textContent.trim(),
					title: title.textContent.trim(),
					count: Number.parseInt(count.textContent, 10),
					bodyHtml: d.querySelector(":scope > div")?.innerHTML ?? "",
				};
			}),
		};
	});
	moits.push({ slug, ...moit, leadHtml: clean(moit.leadHtml), cards: moit.cards.map((c) => ({ ...c, bodyHtml: clean(c.bodyHtml) })) });
}
await browser.close();

const yearHtml = await (await fetch(`${ORIGIN}/ita/2570`)).text();
const rows = [...yearHtml.matchAll(/<p class="text-small text-text-secondary">(.*?)<\/p>/gs)].map((m) => clean(m[1]).trim());
moits.forEach((m, i) => (m.factsHtml = rows[i]));

const itaHtml = await (await fetch(`${ORIGIN}/ita`)).text();
const shell = {
	htmlTag: itaHtml.match(/<html[^>]*>/)[0],
	header: clean(itaHtml.match(/<header.*?<\/header>/s)[0]),
	footer: clean(itaHtml.match(/<footer.*?<\/footer>/s)[0]),
};
await writeFile(new URL("data.json", here), JSON.stringify({ moits }, null, "\t"));
await writeFile(new URL("shell.json", here), JSON.stringify(shell, null, "\t"));
console.log(moits.map((m) => `MOIT ${m.number}: ${m.cards.length} cards, lead ${m.leadHtml ? "yes" : "no"}, facts "${m.factsHtml?.replace(/<[^>]+>/g, "")}"`).join("\n"));

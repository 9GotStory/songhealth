// PROTOTYPE (throwaway), Feature 009: the content the News list and Post page prototype shows.
// node .tmp/prototypes/news-post-redesign/extract.mjs  →  data.json, img/, shell.json
//
// Legacy site News and Activities come from the migration's import plan and its media archive
// (~/.local/state/songhealth-migration/, read only), so data.json and img/ hold Legacy content and
// stay on this machine. The demo dataset's News and Health Content, and the shell every page
// shares, are read from the development runtime's public pages with GET requests.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const MIGRATION = `${homedir()}/.local/state/songhealth-migration`;
const plan = JSON.parse(await readFile(`${MIGRATION}/import-plan.json`, "utf8"));
const fileOf = new Map(plan.files.map((file) => [file.attachment, file]));
await mkdir(new URL("img/", here), { recursive: true });

/** A Legacy picture, shrunk to 1,200 px wide, as img/<name>.webp with its size. */
async function picture(attachment, name) {
	const file = fileOf.get(attachment);
	if (!file) return null;
	const original = execFileSync("unzip", ["-p", `${MIGRATION}/wp-content.zip`, file.path], {
		maxBuffer: 64 * 1024 * 1024,
	});
	const out = await sharp(original)
		.resize({ width: 1200, withoutEnlargement: true })
		.webp({ quality: 78 })
		.toFile(new URL(`img/${name}.webp`, here).pathname);
	return { src: `img/${name}.webp`, width: out.width, height: out.height };
}

const text = (block) => (block.children ?? []).map((span) => span.text ?? "").join("");
const esc = (s) =>
	String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** A Portable Text body as the plain HTML EmDash renders: paragraphs, headings and lists. */
function bodyHtml(blocks = []) {
	const out = [];
	let list = null;
	for (const block of blocks) {
		if (block._type !== "block") continue;
		if (block.listItem) {
			const tag = block.listItem === "number" ? "ol" : "ul";
			if (list?.tag !== tag) out.push((list = { tag, items: [] }));
			list.items.push(`<li>${esc(text(block))}</li>`);
			continue;
		}
		list = null;
		const tag = /^h[2-6]$/.test(block.style) ? block.style : "p";
		if (text(block).trim()) out.push(`<${tag}>${esc(text(block))}</${tag}>`);
	}
	return out
		.map((part) => (typeof part === "string" ? part : `<${part.tag}>${part.items.join("")}</${part.tag}>`))
		.join("\n");
}

const newest = (collection) =>
	plan.entries
		.filter((entry) => entry.collection === collection)
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const legacyNews = [];
for (const entry of newest("news").slice(0, 20)) {
	legacyNews.push({
		slug: entry.slug,
		title: entry.data.title,
		date: entry.publishedAt,
		topic: entry.taxonomies.topic?.length ? "ฝุ่น PM2.5" : undefined,
		image: await picture(entry.data.featured_image.picture, entry.slug),
		body: bodyHtml(entry.data.body),
		bodyPictures: (entry.data.body ?? []).filter((block) => block._type === "image").length,
	});
}
const legacyActivities = [];
for (const entry of newest("activities").slice(0, 16)) {
	legacyActivities.push({
		slug: entry.slug,
		title: entry.data.title,
		date: entry.publishedAt,
		image: await picture(entry.data.featured_image.picture, `act-${entry.slug}`),
	});
}

// The demo dataset's cards, as the runtime's lists show them.
const page = async (path) => (await fetch(ORIGIN + path)).text();
const strip = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function cards(html) {
	return [...html.matchAll(/<article class="group relative h-full".*?<\/article>/gs)].map(([card]) => {
		const meta = card.match(/<p class="flex flex-wrap gap-x-2[^>]*>(.*?)<\/p>/s)?.[1] ?? "";
		const img = card.match(/<img src="([^"]+)"/)?.[1];
		return {
			href: card.match(/<a\s+href="([^"]+)"/)?.[1],
			title: strip(card.match(/<h2[^>]*>(.*?)<\/h2>/s)?.[1] ?? ""),
			label: strip(meta.match(/<span class="wrap-anywhere">(.*?)<\/span>/s)?.[1] ?? "") || undefined,
			date: meta.match(/datetime="([^"]+)"/)?.[1],
			summary: strip(card.match(/<p class="line-clamp-3[^>]*>(.*?)<\/p>/s)?.[1] ?? "") || undefined,
			img: img ? ORIGIN + unesc(img) : undefined,
		};
	});
}
const newsHtml = await page("/news");
const demoNews = cards(newsHtml);
const demoHealth = cards(await page("/health/content"));

// The shell: the header and footer of a page in the News section, with addresses on the runtime.
const clean = (html) =>
	html
		.replace(/ data-astro-source-[a-z]+="[^"]*"/g, "")
		.replace(/(href|src|action)="\//g, `$1="${ORIGIN}/`);
const shell = {
	header: clean(newsHtml.match(/<header.*?<\/header>/s)[0]),
	footer: clean(newsHtml.match(/<footer.*?<\/footer>/s)[0]),
};

await writeFile(
	new URL("data.json", here),
	JSON.stringify({ legacyNews, legacyActivities, demoNews, demoHealth }, null, "\t"),
);
await writeFile(new URL("shell.json", here), JSON.stringify(shell, null, "\t"));
console.log(
	`news ${legacyNews.length}, activities ${legacyActivities.length}, demo news ${demoNews.length}, demo health ${demoHealth.length}`,
);
for (const item of [...legacyNews.slice(0, 4), ...legacyActivities.slice(0, 4)])
	console.log(item.slug, item.image && `${item.image.width}x${item.image.height}`, item.body?.length ?? "");

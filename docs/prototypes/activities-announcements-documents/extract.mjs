// PROTOTYPE (throwaway), Feature 010: the content the Activities, Announcements and Documents
// prototype shows.
// node .tmp/prototypes/activities-announcements-documents/extract.mjs  →  data.json, img/, shell.json
//
// Legacy site Activities, Announcements and Documents come from the migration's import plan and its
// media archive (~/.local/state/songhealth-migration/, read only), so data.json and img/ hold Legacy
// content and stay on this machine. The demo dataset's items, and the shell every page shares, are
// read from the development runtime's public pages with GET requests.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const MIGRATION = `${homedir()}/.local/state/songhealth-migration`;
const ZIP = `${MIGRATION}/wp-content.zip`;
const plan = JSON.parse(await readFile(`${MIGRATION}/import-plan.json`, "utf8"));
const fileOf = new Map(plan.files.map((file) => [file.attachment, file]));
await mkdir(new URL("img/", here), { recursive: true });

// Each archived file's size, from the zip's listing.
const sizeOf = new Map();
for (const line of execFileSync("unzip", ["-l", ZIP], { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n")) {
	const m = line.match(/^\s*(\d+)\s+\S+\s+\S+\s+(.+)$/);
	if (m) sizeOf.set(m[2], Number(m[1]));
}
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`);

/** A Legacy picture, shrunk to 1,200 px wide, as img/<name>.webp with its size. */
async function picture(attachment, name) {
	const file = fileOf.get(attachment);
	if (!file) return null;
	const original = execFileSync("unzip", ["-p", ZIP, file.path], { maxBuffer: 64 << 20 });
	const out = await sharp(original)
		.resize({ width: 1200, withoutEnlargement: true })
		.webp({ quality: 78 })
		.toFile(new URL(`img/${name}.webp`, here).pathname);
	return { src: `img/${name}.webp`, width: out.width, height: out.height };
}

const newest = (collection) =>
	plan.entries
		.filter((entry) => entry.collection === collection)
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const legacyActivities = [];
for (const entry of newest("activities").slice(0, 26)) {
	legacyActivities.push({
		slug: entry.slug,
		title: entry.data.title,
		date: entry.publishedAt,
		image: await picture(entry.data.featured_image.picture, `act-${entry.slug}`),
	});
}

const TYPE_LABELS = { general: "ทั่วไป", procurement: "จัดซื้อจัดจ้าง", recruitment: "รับสมัคร", order: "คำสั่ง" };
const legacyDocuments = newest("documents").map((entry) => {
	const file = fileOf.get(entry.data.file?.fileField);
	const ext = file?.filename.split(".").pop().toUpperCase();
	return {
		slug: entry.slug,
		title: entry.data.title,
		date: entry.data.document_at,
		fiscalYear: entry.data.fiscal_year,
		type: TYPE_LABELS[entry.taxonomies.document_type?.[0]],
		file: file ? { kind: ext, size: kb(sizeOf.get(file.path) ?? 0) } : null,
	};
});
const legacyAnnouncements = newest("announcements").map((entry) => ({
	slug: entry.slug,
	title: entry.data.title,
	date: entry.data.announcement_at ?? entry.publishedAt,
	published: entry.publishedAt,
	type: entry.taxonomies.announcement_type?.[0],
	typeLabel: TYPE_LABELS[entry.taxonomies.announcement_type?.[0]],
	documents: entry.documents ?? [],
}));

// The demo dataset, as the runtime's pages show it.
const page = async (path) => (await fetch(ORIGIN + path)).text();
const strip = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const main = (html) => html.match(/<main[\s\S]*?<\/main>/)[0];
/** A page's details card, each term with its text and its first date. */
function details(html) {
	const out = {};
	for (const [, dt, dd] of main(html).matchAll(/<dt[^>]*>(.*?)<\/dt><dd[^>]*>(.*?)<\/dd>/gs))
		out[strip(dt)] = { text: strip(dd), date: dd.match(/datetime="([^"]+)"/)?.[1] };
	return out;
}
const slugs = (html, base) => [...new Set([...main(html).matchAll(new RegExp(`href="(${base}/[a-z0-9-]+)"`, "g"))].map((m) => m[1]))];

/** A runtime picture saved as img/<name>.webp, so the static pages need no request to the runtime. */
async function saved(url, name) {
	const response = await fetch(url);
	await sharp(Buffer.from(await response.arrayBuffer()))
		.resize({ width: 1200, withoutEnlargement: true })
		.webp({ quality: 78 })
		.toFile(new URL(`img/${name}.webp`, here).pathname);
	return `img/${name}.webp`;
}
const demoActivities = [];
const activityList = main(await page("/activities"));
for (const path of slugs(activityList, "/activities")) {
	const card = activityList.slice(activityList.indexOf(`href="${path}"`) - 30000, activityList.indexOf(`href="${path}"`));
	const article = card.slice(card.lastIndexOf("<article"));
	const img = article.match(/<img src="([^"]+)"/)?.[1];
	const html = await page(path);
	const d = details(html);
	demoActivities.push({
		slug: path.split("/").pop(),
		title: strip(main(html).match(/<h1[^>]*>(.*?)<\/h1>/s)[1]),
		summary: strip(article.match(/<p class="[^"]*line-clamp[^"]*"[^>]*>(.*?)<\/p>/s)?.[1] ?? "") || undefined,
		date: d["วันที่จัดกิจกรรม"]?.date ?? article.match(/datetime="([^"]+)"/)?.[1],
		place: d["สถานที่จัดกิจกรรม"]?.text,
		img: img ? await saved(ORIGIN + unesc(img), `demo-${path.split("/").pop()}`) : undefined,
	});
}

const demoAnnouncements = [];
for (const path of slugs(await page("/announcements"), "/announcements")) {
	const html = await page(path);
	const d = details(html);
	demoAnnouncements.push({
		slug: path.split("/").pop(),
		title: strip(main(html).match(/<h1[^>]*>(.*?)<\/h1>/s)[1]),
		typeLabel: d["ประเภทประกาศ"]?.text,
		date: d["วันที่ประกาศ"]?.date,
		published: main(html).match(/เผยแพร่ <time datetime="([^"]+)"/)?.[1],
		opens: d["วันที่เริ่มต้น"]?.date,
		closes: d["วันที่สิ้นสุด"]?.date,
		status: d["สถานะ"]?.text,
		body: main(html).match(/<div class="rich-text">([\s\S]*?)<\/div>/)?.[1],
	});
}

const demoDocuments = [];
for (const path of slugs(await page("/documents"), "/documents")) {
	const html = await page(path);
	const d = details(html);
	const download = strip(main(html).match(/ดาวน์โหลดเอกสาร \(([^)]+)\)/)?.[1] ?? "");
	demoDocuments.push({
		slug: path.split("/").pop(),
		title: strip(main(html).match(/<h1[^>]*>(.*?)<\/h1>/s)[1]),
		summary: strip(main(html).match(/<p class="text-body-large text-text-secondary">(.*?)<\/p>/s)?.[1] ?? "") || undefined,
		type: d["ประเภทเอกสาร"]?.text,
		date: d["วันที่เอกสาร"]?.date,
		fiscalYear: d["ปีงบประมาณ"]?.text,
		owner: d["เจ้าของ/แหล่งที่มา"]?.text,
		status: d["สถานะเอกสาร"]?.text,
		topics: d["ประเด็นสุขภาพ"]?.text,
		file: download ? { kind: download.split(",")[0].trim(), size: download.split(",")[1]?.trim() } : null,
	});
}

// The shell: the header and footer of a page in the News section, with addresses on the runtime.
const clean = (html) =>
	html.replace(/ data-astro-source-[a-z]+="[^"]*"/g, "").replace(/(href|src|action)="\//g, `$1="${ORIGIN}/`);
const announcementsHtml = await page("/announcements");
const documentsHtml = await page("/documents");
const shell = {
	header: clean(announcementsHtml.match(/<header.*?<\/header>/s)[0]),
	headerDocuments: clean(documentsHtml.match(/<header.*?<\/header>/s)[0]),
	footer: clean(announcementsHtml.match(/<footer.*?<\/footer>/s)[0]),
};

await writeFile(
	new URL("data.json", here),
	JSON.stringify(
		{ legacyActivities, legacyAnnouncements, legacyDocuments, demoActivities, demoAnnouncements, demoDocuments },
		null,
		"\t",
	),
);
await writeFile(new URL("shell.json", here), JSON.stringify(shell, null, "\t"));
console.log(
	`legacy: activities ${legacyActivities.length}, announcements ${legacyAnnouncements.length}, documents ${legacyDocuments.length}; ` +
		`demo: activities ${demoActivities.length}, announcements ${demoAnnouncements.length}, documents ${demoDocuments.length}`,
);

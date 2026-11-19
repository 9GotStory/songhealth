// PROTOTYPE (throwaway), Feature 012: the content and the shell the builder reads.
// node .tmp/prototypes/about-contact-pages/extract.mjs  →  data.json, shell.json
//
// The content is the demo dataset's (scripts/demo-dataset/content.ts, read through Node's type
// stripping): its Personnel, the About Documents and the Basic Pages, Office Contact and the
// channels. What only the runtime knows is read from the development runtime's public pages with
// GET requests: each person's picture address, each Document's file label ("PDF, 12.4 KB"), each
// Basic Page's rendered body, the channels' labels, and the shell (the header with the right
// section marked, and the footer). Nothing here comes from the Legacy site.
import { writeFile } from "node:fs/promises";
import { demoDataset } from "../../../scripts/demo-dataset/content.ts";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const NOW = new Date("2026-11-19T05:00:00Z");
const page = async (path) => {
	const response = await fetch(ORIGIN + path);
	if (!response.ok) throw new Error(`${path}: ${response.status}`);
	return response.text();
};
const clean = (html) =>
	html
		.replace(/ data-astro-[a-z-]+="[^"]*"/g, "")
		.replace(/ data-astro-[a-z-]+(?=[ >])/g, "")
		.replace(/(href|src|action)="\//g, `$1="${ORIGIN}/`)
		.replace(/(srcset)="[^"]*"/g, "");
/** The element starting at `start`, with its nested elements of the same tag. */
const balanced = (html, start, tag) => {
	const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
	re.lastIndex = start;
	let depth = 0;
	for (let m; (m = re.exec(html)); ) {
		depth += m[0].startsWith("</") ? -1 : 1;
		if (depth === 0) return html.slice(start, re.lastIndex);
	}
	throw new Error("unbalanced");
};

const demo = demoDataset(NOW);
const of = (collection) => demo.entries.filter((e) => e.collection === collection);
const label = (taxonomy, slug) => demo.terms.find((t) => t.taxonomy === taxonomy && t.slug === slug)?.label;
const iso = (v) => (v instanceof Date ? v.toISOString() : (v ?? null));

// Each person's picture, from the card /about/personnel renders for them.
const personnelHtml = await page("/about/personnel");
const pictures = {};
for (const article of personnelHtml.match(/<article\b.*?<\/article>/gs)) {
	const name = article.match(/<h3[^>]*>(.*?)<\/h3>/s)[1].replace(/<[^>]+>/g, "");
	const src = article.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1];
	if (!src) {
		pictures[name] = null;
		continue;
	}
	// A file:// page cannot load the runtime's pictures, so each is saved beside the pages.
	const file = `picture-${Object.keys(pictures).length + 1}.webp`;
	const response = await fetch(ORIGIN + src.replace(/&amp;/g, "&"));
	await writeFile(new URL(file, here), Buffer.from(await response.arrayBuffer()));
	pictures[name] = file;
}
const personnel = of("personnel").map((p) => ({
	slug: p.slug,
	name: p.data.title,
	assignment: p.data.current_assignment ?? null,
	unit: p.data.organizational_unit ?? null,
	contact: p.data.public_contact ?? null,
	leadershipOrder: p.data.leadership_order ?? null,
	picture: pictures[p.data.title] ?? null,
}));

const documents = {};
for (const d of of("documents")) {
	const html = await page(`/documents/${d.slug}`);
	const fileLabel = html.match(/\((PDF, [^)]+)\)/)?.[1];
	const [kind, size] = (fileLabel ?? "").split(",").map((s) => s.trim());
	documents[d.slug] = {
		slug: d.slug,
		title: d.data.title,
		summary: d.data.summary ?? null,
		date: iso(d.data.document_at),
		published: iso(d.publishedAt),
		fiscalYear: d.data.fiscal_year ?? null,
		typeSlug: d.taxonomies?.document_type?.[0] ?? null,
		type: label("document_type", d.taxonomies?.document_type?.[0]) ?? null,
		status: d.data.domain_status ?? null,
		file: kind ? { kind, size } : null,
	};
}

const pages = {};
for (const p of of("pages")) {
	const path = p.slug === "about" ? "/about" : p.slug === "organization" ? "/about/organization" : `/pages/${p.slug}`;
	const html = await page(path);
	const start = html.indexOf('<div class="rich-text">');
	pages[p.slug] = {
		slug: p.slug,
		title: p.data.title,
		summary: p.data.summary ?? null,
		body: start >= 0 ? clean(balanced(html, start, "div")) : null,
		documents: p.references?.documents ?? [],
	};
}

const contactHtml = await page("/contact");
const channels = [...contactHtml.matchAll(/<li><a class="inline-flex min-h-11[^"]*" href="(https?:[^"]+)"[^>]*>([^<]+)<span/g)].map(
	([, href, text]) => ({ href, label: text.replace(/\s*\(เว็บไซต์ภายนอก\)\s*$/, "") }),
);
const contactLead = contactHtml.match(/<p class="max-w-prose[^"]*">([^<]+)<\/p>/)[1];

const aboutHtml = await page("/about/leadership");
const shell = {
	headerAbout: clean(aboutHtml.match(/<header.*?<\/header>/s)[0]),
	headerNone: clean(contactHtml.match(/<header.*?<\/header>/s)[0]),
	footer: clean(contactHtml.match(/<footer.*?<\/footer>/s)[0]),
};

const c = demo.settings?.officeContact ?? demo.officeContact;
await writeFile(
	new URL("data.json", here),
	JSON.stringify(
		{
			personnel,
			documents,
			pages,
			contact: {
				address: c.address,
				telephone: c.telephone,
				email: c.email,
				openingHours: c.opening_hours,
				latitude: c.latitude,
				longitude: c.longitude,
			},
			channels,
			contactLead,
		},
		null,
		"\t",
	),
);
await writeFile(new URL("shell.json", here), JSON.stringify(shell, null, "\t"));
console.log(
	`personnel ${personnel.length} (pictures ${Object.values(pictures).filter(Boolean).length}), documents ${Object.keys(documents).length}, pages ${Object.keys(pages).length}, channels ${channels.length}`,
);

// PROTOTYPE (throwaway), Feature 011: the content and the shell the builder reads.
// node .tmp/prototypes/health-reports-services-health-services/extract.mjs  →  data.json, shell.json
//
// The content is the demo dataset's (scripts/demo-dataset/content.ts, read through Node's type
// stripping), at the day of the grill: its Services, Health Services, Health Reports and their
// Documents, with their terms' labels. The file label of each Document ("PDF, 12.4 KB") and the
// shell (the header with the right section marked, and the footer) are read from the development
// runtime's public pages, with GET requests. Nothing here comes from the Legacy site.
import { writeFile } from "node:fs/promises";
import { demoDataset } from "../../../scripts/demo-dataset/content.ts";

const here = new URL("./", import.meta.url);
const ORIGIN = "http://127.0.0.1:4324";
const NOW = new Date("2026-11-17T05:00:00Z");
const page = async (path) => {
	const response = await fetch(ORIGIN + path);
	if (!response.ok) throw new Error(`${path}: ${response.status}`);
	return response.text();
};

const demo = demoDataset(NOW);
const label = (taxonomy, slug) => demo.terms.find((t) => t.taxonomy === taxonomy && t.slug === slug)?.label;
const of = (collection) => demo.entries.filter((e) => e.collection === collection);
const iso = (v) => (v instanceof Date ? v.toISOString() : v ?? null);
const text = (blocks) =>
	(blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text).join("")).filter(Boolean);

const documents = {};
for (const d of of("documents")) {
	if (!/report|complaint/.test(d.slug)) continue;
	const html = await page(`/documents/${d.slug}`);
	const fileLabel = html.match(/ดาวน์โหลดเอกสาร <span[^>]*>\(([^)]+)\)/)?.[1] ?? html.match(/\((PDF, [^)]+)\)/)?.[1];
	const [kind, size] = (fileLabel ?? "").split(",").map((s) => s.trim());
	documents[d.slug] = {
		slug: d.slug,
		title: d.data.title,
		summary: d.data.summary ?? null,
		date: iso(d.data.document_at),
		fiscalYear: d.data.fiscal_year ?? null,
		type: label("document_type", d.taxonomies?.document_type?.[0]) ?? null,
		file: kind ? { kind, size } : null,
	};
}

const services = of("services").map((s) => ({
	slug: s.slug,
	title: s.data.title,
	summary: s.data.summary ?? null,
	icon: s.data.icon ?? null,
	category: label("service_category", s.taxonomies.service_category[0]),
	ownership: s.data.ownership_type ?? null,
	provider: s.data.provider_text ?? null,
	externalUrl: s.data.external_url ?? null,
	channels: s.data.channels ?? [],
	eligibility: text(s.data.eligibility),
	steps: text(s.data.steps),
	requiredDocuments: text(s.data.required_documents_guidance),
	contact: text(s.data.contact_location_guidance),
	duration: s.data.duration ?? null,
	fees: s.data.fees ?? null,
	notes: s.data.notes ?? null,
	documents: s.references?.documents ?? [],
}));

const healthServices = of("health_services").map((h) => ({
	slug: h.slug,
	title: h.data.title,
	displayName: h.data.display_name ?? null,
	type: label("facility_type", h.taxonomies.facility_type[0]),
	areas: h.taxonomies.area.map((a) => label("area", a)),
	status: h.data.operational_status ?? null,
	affiliation: h.data.affiliation_text ?? null,
	address: h.data.address ?? null,
	latitude: h.data.latitude ?? null,
	longitude: h.data.longitude ?? null,
	hours: h.data.opening_hours ?? null,
	contact: h.data.public_contact ?? null,
	code: h.data.facility_code ?? null,
	offers: h.references?.offered_services ?? [],
}));

const healthReports = of("health_reports").map((r) => ({
	slug: r.slug,
	title: r.data.title,
	summary: r.data.summary ?? null,
	type: label("report_type", r.taxonomies.report_type[0]),
	reportAt: iso(r.data.report_at),
	published: iso(r.publishedAt),
	period: r.data.reporting_period ?? null,
	fiscalYear: r.data.fiscal_year ?? null,
	owner: r.data.owner_source ?? null,
	document: r.references.report_document[0],
}));

const clean = (html) =>
	html.replace(/ data-astro-source-[a-z]+="[^"]*"/g, "").replace(/(href|src|action)="\//g, `$1="${ORIGIN}/`);
const servicesHtml = await page("/services");
const healthHtml = await page("/health/reports");
const shell = {
	headerServices: clean(servicesHtml.match(/<header.*?<\/header>/s)[0]),
	headerHealth: clean(healthHtml.match(/<header.*?<\/header>/s)[0]),
	footer: clean(servicesHtml.match(/<footer.*?<\/footer>/s)[0]),
};

await writeFile(
	new URL("data.json", here),
	JSON.stringify({ services, healthServices, healthReports, documents }, null, "\t"),
);
await writeFile(new URL("shell.json", here), JSON.stringify(shell, null, "\t"));
console.log(
	`services ${services.length}, health services ${healthServices.length}, reports ${healthReports.length}, documents ${Object.keys(documents).length}`,
);

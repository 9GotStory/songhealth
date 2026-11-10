// Screenshot content for the shared filter form's clear action (#197; spec #190 "FilterForm clear
// action"): each of the five lists narrowed by an applied filter to a published entry made here,
// so the clear link shows. Each list is captured whole, since a close-up would draw its selects
// open (scripts/capture-screenshots.mjs), at the widths the ticket names and both sides of the
// form's 640 px edge.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [320, 375, 639, 640, 1440];
const FISCAL_YEAR = 2569;
const NAME_WORD = "รพ.สต.";

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const publish = (collection: string, { id }: { id: string }) =>
		helpers.publishEntryAt(admin, collection, id);
	const taxonomies = {
		service_category: [await term("service_category", "ตัวอย่างหมวดบริการ")],
		document_type: [await term("document_type", "ตัวอย่างประเภทเอกสาร")],
		topic: [await term("topic", "ตัวอย่างประเด็นสุขภาพ")],
		area: [await term("area", "ตัวอย่างตำบล")],
	};
	const [category] = taxonomies.service_category;
	const [type] = taxonomies.document_type;
	const [topic] = taxonomies.topic;
	const [area] = taxonomies.area;

	await publish(
		"services",
		await helpers.createSyntheticDraft(admin, "services", "ตัวอย่าง", "shot", {
			data: { title: "[ตัวอย่าง] บริการตามหมวดที่เลือก" },
			taxonomies: { service_category: [category] },
		}),
	);
	await publish(
		"documents",
		await helpers.createSyntheticDocument(admin, "shot", {
			data: { title: "[ตัวอย่าง] เอกสารตามตัวกรองที่เลือก", fiscal_year: FISCAL_YEAR },
			taxonomies: { document_type: [type], topic: [topic] },
		}),
	);
	for (const [collection, title] of [
		["news", "[ตัวอย่าง] ข่าวตามประเด็นที่เลือก"],
		["health_content", "[ตัวอย่าง] ความรู้ตามประเด็นที่เลือก"],
	] as const) {
		await publish(
			collection,
			await helpers.createSyntheticDraft(admin, collection, "ตัวอย่าง", "shot", {
				data: { title },
				taxonomies: { topic: [topic] },
			}),
		);
	}
	await publish(
		"health_services",
		await helpers.createSyntheticHealthService(admin, "shot", {
			data: { title: `[ตัวอย่าง] ${NAME_WORD}ตามตำบลที่เลือก` },
			taxonomies: { area: [area] },
		}),
	);

	const lists = [
		{ name: "services", path: `/services?category=${category}` },
		{ name: "documents", path: `/documents?type=${type}&topic=${topic}&year=${FISCAL_YEAR}` },
		{ name: "health-news", path: `/news/health?topic=${topic}` },
		{ name: "health-content", path: `/health/content?topic=${topic}` },
		{
			name: "health-services",
			path: `/health-services?area=${area}&name=${encodeURIComponent(NAME_WORD)}`,
		},
	];
	return lists.flatMap(({ name, path }) =>
		WIDTHS.map((width) => ({ name: `${name}-${width}`, path: `${path}@${width}` })),
	);
};

export default fixtures;

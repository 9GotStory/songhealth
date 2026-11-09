// Screenshot content for the public list filters (#176; spec #174 "Public list filters"): for each
// filtered list, a term that one of its published entries carries; a Document Type, a Service
// Category and a Health Topic that only drafts carry; and Health Topics that only one list's
// published entries carry. Captures each list's filter form at 1440 and 375 px, its selects shown
// as the lists of their options (scripts/capture-screenshots.mjs), so a choice that leads to an
// empty list shows before the change and is gone after it.

import type { Fixtures } from "../capture-with-fixtures.ts";

/** Each filtered list's address and the file-name base of its captures. */
const LISTS = [
	{ name: "documents", path: "/documents" },
	{ name: "health-content", path: "/health/content" },
	{ name: "news-health", path: "/news/health" },
	{ name: "services", path: "/services" },
];

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	/** An entry of `collection` titled `title` with `taxonomies`, published unless it is a draft. */
	const entry = async (
		collection: string,
		title: string,
		taxonomies: Record<string, string[]>,
		{ draft = false } = {},
	) => {
		// The helpers title an entry by its kind and label; `data.title` takes the place of that.
		const fields = { data: { title: `[ตัวอย่าง] ${title}` }, taxonomies };
		const { id } =
			collection === "documents"
				? await helpers.createSyntheticDocument(admin, "shot", fields)
				: await helpers.createSyntheticDraft(admin, collection, "ตัวอย่าง", "shot", fields);
		if (!draft) await helpers.publishEntryAt(admin, collection, id);
	};
	const draftTopic = await term("topic", "สุขภาพช่องปาก");

	await entry("documents", "คู่มือการคัดกรองวัณโรคในชุมชน", {
		document_type: [await term("document_type", "คู่มือ")],
		topic: [await term("topic", "วัณโรค")],
	});
	await entry(
		"documents",
		"ระเบียบการตรวจสุขภาพช่องปาก (ฉบับร่าง)",
		{ document_type: [await term("document_type", "ระเบียบ")], topic: [draftTopic] },
		{ draft: true },
	);
	await entry("health_content", "การนวดไทยเพื่อสุขภาพ", {
		topic: [await term("topic", "การแพทย์แผนไทย")],
	});
	await entry(
		"health_content",
		"การแปรงฟันที่ถูกวิธี (ฉบับร่าง)",
		{ topic: [draftTopic] },
		{ draft: true },
	);
	await entry("news", "รณรงค์ต่อต้านยาเสพติดในโรงเรียน", {
		topic: [await term("topic", "ยาเสพติด")],
	});
	await entry("news", "ตรวจฟันเด็กนักเรียน (ฉบับร่าง)", { topic: [draftTopic] }, { draft: true });
	await entry("services", "ยืนยันสิทธิ อสม.", {
		service_category: [await term("service_category", "บริการสำหรับ อสม.")],
	});
	await entry(
		"services",
		"บริการที่ยังเป็นฉบับร่าง",
		{ service_category: [await term("service_category", "หมวดที่มีแต่ฉบับร่าง")] },
		{ draft: true },
	);

	return LISTS.flatMap(({ name, path }) =>
		[1440, 375].map((width) => ({
			name: `${name}-filter-${width}`,
			path: `${path}@${width}>main form`,
		})),
	);
};

export default fixtures;

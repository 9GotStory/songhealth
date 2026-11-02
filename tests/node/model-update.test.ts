// The model-update step's planner (#53, #122; spec #51, "Changes to the Feature 002 model"; spec
// #121, "Content model").
//
// `planModelUpdate` compares the content model of seed/seed.json with the live model that
// EmDash's schema API reports, and plans the native updates that bring the database to the
// seed's model; `planRequests` orders them as EmDash needs them. The step applies the plan, and
// the development runtime's verify check passes only while the plan is empty.
//
// Expected values come from `03` §15 (the canonical route table in
// tests/canonical-url-patterns.ts), `03` §5 (no per-person route), spec #51 "Changes to the
// Feature 002 model" (the Document Type reference terms, Personnel's `leadership_order` and the
// Homepage menus) and spec #121 "Content model" (the MOIT collection and the three ITA block
// types), never from the seed. The live models start from the seed's own fields and block types,
// as setup or the step leaves them.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	planModelUpdate,
	planRequests,
	type BlockField,
	type LiveBlockType,
	type LiveCollection,
	type LiveField,
	type LiveMenu,
	type LiveModel,
	type LiveTaxonomy,
} from "../../scripts/model-update.mjs";
import { CANONICAL_URL_PATTERNS } from "../canonical-url-patterns.ts";

const seed = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8"));

const FEATURE_002_SUPPORTS = ["drafts", "revisions", "preview", "scheduling"];

/** The reference terms the About Policies, Plans and Results pages list Documents by (#60). */
const DOCUMENT_TYPE_TERMS = [
	{ taxonomy: "document_type", slug: "policy", label: "นโยบาย" },
	{ taxonomy: "document_type", slug: "plan", label: "แผนงาน" },
	{ taxonomy: "document_type", slug: "result", label: "ผลการดำเนินงาน" },
];

/** The Leadership order Feature 003 adds to Personnel (spec #51; empty means not Leadership). */
const LEADERSHIP_ORDER = { slug: "leadership_order", label: "ลำดับผู้บริหาร", type: "integer" };

/**
 * The menus staff curate the Homepage with (#65; spec #51). EmDash 1.1.0 gives a menu a name and a
 * label only (src/api/schemas/menus.ts createMenuBody), so each Thai label says what the menu does,
 * in place of the description #51 asks for (Product Owner, 2026-10-31: #65 comment 6538358352).
 */
const HOMEPAGE_MENUS: LiveMenu[] = [
	{ name: "homepage-featured", label: "หน้าแรก: เรื่องเด่น (แสดงรายการแรกที่เผยแพร่อยู่)" },
	{
		name: "homepage-services",
		label: "หน้าแรก: บริการที่ใช้บ่อย (เลือกจากบริการประชาชน แสดงไม่เกิน 6 รายการ)",
	},
	{ name: "homepage-quick-access", label: "หน้าแรก: เข้าถึงข้อมูล (ทางลัด แสดงไม่เกิน 4 รายการ)" },
];

/**
 * The Round of a piece of Evidence: a required select whose default is an explicit "ไม่ระบุรอบ",
 * because the Admin cannot clear a chosen select (Product Owner, 2026-11-02, spec #121).
 */
const ROUND = {
	slug: "round",
	type: "select",
	required: true,
	defaultValue: "ไม่ระบุรอบ",
	validation: { options: ["ไม่ระบุรอบ", "รอบ 6 เดือน", "รอบ 12 เดือน"] },
};

/** The ITA block types of spec #121, in the order the Evidence field's picker offers them. */
const ITA_BLOCK_TYPES = [
	{
		slug: "ita_requirement",
		label: "ข้อกำหนด",
		category: "ITA",
		fields: [
			{ slug: "number", type: "string", required: true },
			{ slug: "title", type: "text", required: true },
		],
	},
	{
		slug: "ita_file",
		label: "หลักฐาน: ไฟล์",
		category: "ITA",
		fields: [
			{ slug: "label", type: "string", required: true },
			{ slug: "file", type: "file", required: true },
			ROUND,
			{ slug: "note", type: "string", required: false },
		],
	},
	{
		slug: "ita_link",
		label: "หลักฐาน: ลิงก์",
		category: "ITA",
		fields: [
			{ slug: "label", type: "string", required: true },
			{ slug: "url", type: "url", required: true },
			ROUND,
			{ slug: "current", type: "boolean", required: false },
		],
	},
];

/** The MOIT collection of spec #121: one entry per MOIT per fiscal year, in the Admin group ITA. */
const MOIT = {
	slug: "moit",
	label: "MOIT",
	group: "ITA",
	supports: [...FEATURE_002_SUPPORTS, "seo"],
	urlPattern: "/ita/{slug}",
	routable: true,
};

/** MOIT's Evidence: at most 100 blocks of the ITA types. */
const EVIDENCE_VALIDATION = {
	allowedTypes: ITA_BLOCK_TYPES.map(({ slug }) => slug),
	maxItems: 100,
};

/** MOIT's six fields, in order. */
const MOIT_FIELDS = [
	{ slug: "title", type: "string", required: true },
	{ slug: "fiscal_year", type: "integer", required: true },
	{ slug: "number", type: "integer", required: true },
	{ slug: "summary", type: "text", required: false },
	{ slug: "updated_on", type: "datetime", required: false },
	{ slug: "evidence", type: "blocks", required: false, validation: EVIDENCE_VALIDATION },
];

/** A plan that changes nothing. */
const NOTHING = {
	blockTypes: [],
	blockTypeUpdates: [],
	newCollections: [],
	collections: [],
	fields: [],
	fieldUpdates: [],
	terms: [],
	menus: [],
	problems: [],
};

/**
 * What a source states of a field: its slug, its type, whether it is required, and its default
 * and validation where it has them. Labels are compared on their own, where the spec names one.
 */
function contractOf({ slug, type, required = false, defaultValue, validation }: BlockField) {
	return {
		slug,
		type,
		required,
		...(defaultValue === undefined ? {} : { defaultValue }),
		...(validation === undefined ? {} : { validation }),
	};
}

/**
 * The fields of a seed collection as the schema API lists them, by slug and type, a blocks field
 * with its validation as EmDash completes it (emdash 1.1.0 src/schema/registry.ts
 * normalizeBlocksFieldValidation).
 */
function seedFields(slug: string): LiveField[] {
	const collection = seed.collections.find(
		(candidate: { slug: string }) => candidate.slug === slug,
	);
	assert.ok(collection, `the seed has no ${slug} collection`);
	return collection.fields.map(({ slug, type, validation }: LiveField) =>
		type === "blocks"
			? { slug, type, validation: { retiredTypes: [], minItems: 0, ...validation } }
			: { slug, type },
	);
}

/** The seed's block types as the schema API lists them once created, each version fingerprinted. */
function seedBlockTypes(): LiveBlockType[] {
	return seed.blockTypes.map(({ versions, ...blockType }: LiveBlockType) => ({
		...blockType,
		versions: versions.map(({ version, fields }) => ({
			version,
			fields,
			fingerprint: `block-type:v1:sha256:${blockType.slug}-${version}`,
		})),
	}));
}

/** The fields Feature 002 gave a collection: Personnel had no Leadership order yet. */
function feature002Fields(slug: string): LiveField[] {
	return seedFields(slug).filter((field) => field.slug !== LEADERSHIP_ORDER.slug);
}

/** The ten collections as the schema API lists them on a Feature 002 database, with no terms. */
function feature002Model(): LiveModel {
	return {
		blockTypes: [],
		collections: [...Object.keys(CANONICAL_URL_PATTERNS), "personnel"].map((slug) => ({
			slug,
			supports: [...FEATURE_002_SUPPORTS],
			hasSeo: false,
			routable: true,
			fields: feature002Fields(slug),
		})),
		taxonomies: [{ name: "document_type", terms: [] }],
		menus: [],
	};
}

/** The same collections once the Feature 003 model is applied. */
function feature003Model(): LiveModel {
	return {
		blockTypes: [],
		collections: [
			...Object.entries(CANONICAL_URL_PATTERNS).map(([slug, urlPattern]) => ({
				slug,
				urlPattern,
				supports: [...FEATURE_002_SUPPORTS, "seo"],
				hasSeo: true,
				routable: true,
				fields: feature002Fields(slug),
			})),
			{
				slug: "personnel",
				supports: [...FEATURE_002_SUPPORTS],
				hasSeo: false,
				routable: false,
				fields: [...feature002Fields("personnel"), { slug: "leadership_order", type: "integer" }],
			},
		],
		taxonomies: [
			{
				name: "document_type",
				terms: DOCUMENT_TYPE_TERMS.map(({ slug, label }) => ({ slug, label })),
			},
		],
		menus: HOMEPAGE_MENUS.map((menu) => ({ ...menu })),
	};
}

/** The same database once the Feature 004 model is applied: MOIT and the ITA block types. */
function feature004Model(): LiveModel {
	const model = feature003Model();
	model.collections.push({
		slug: MOIT.slug,
		urlPattern: MOIT.urlPattern,
		supports: [...MOIT.supports],
		hasSeo: true,
		routable: true,
		fields: seedFields(MOIT.slug),
	});
	model.blockTypes = seedBlockTypes();
	return model;
}

function collectionOf(model: LiveModel, slug: string): LiveCollection {
	const collection = model.collections.find((candidate) => candidate.slug === slug);
	assert.ok(collection, `the test model has no ${slug} collection`);
	return collection;
}

function taxonomyOf(model: LiveModel, name: string): LiveTaxonomy {
	const taxonomy = model.taxonomies.find((candidate) => candidate.name === name);
	assert.ok(taxonomy, `the test model has no ${name} taxonomy`);
	return taxonomy;
}

/** A block type of a test model with its only version, the active one. */
function blockTypeOf(model: LiveModel, slug: string) {
	const blockType = model.blockTypes.find((candidate) => candidate.slug === slug);
	assert.ok(blockType, `the test model has no ${slug} block type`);
	const [version] = blockType.versions;
	assert.ok(version, `the test model's ${slug} block type has no version`);
	return { blockType, version };
}

describe("planModelUpdate", () => {
	it("gives a Feature 002 database the 03 §15 URL patterns and SEO, and makes Personnel non-routable", () => {
		const plan = planModelUpdate(seed, feature002Model());

		assert.deepEqual(plan.problems, []);
		const updates = new Map(plan.collections.map(({ slug, update }) => [slug, update]));
		for (const [slug, urlPattern] of Object.entries(CANONICAL_URL_PATTERNS)) {
			assert.deepEqual(
				updates.get(slug),
				{ urlPattern, supports: [...FEATURE_002_SUPPORTS, "seo"], hasSeo: true },
				slug,
			);
		}
		assert.deepEqual(updates.get("personnel"), { routable: false });
		assert.equal(updates.size, 10);
	});

	it("adds the Document Type reference terms policy, plan and result to a database without them", () => {
		assert.deepEqual(planModelUpdate(seed, feature002Model()).terms, DOCUMENT_TYPE_TERMS);
	});

	it("adds Personnel's optional integer field leadership_order (ลำดับผู้บริหาร) to a database without it", () => {
		const plan = planModelUpdate(seed, feature002Model());

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(
			plan.fields.filter(({ collection }) => collection === "personnel"),
			[{ collection: "personnel", field: LEADERSHIP_ORDER }],
		);
	});

	it("creates the three Homepage menus, empty, with their Thai labels, on a database without them", () => {
		assert.deepEqual(planModelUpdate(seed, feature002Model()).menus, HOMEPAGE_MENUS);
	});

	it("plans nothing for a database already on the model, so a second run changes nothing", () => {
		const plan = planModelUpdate(seed, feature004Model());

		assert.deepEqual(plan, NOTHING);
		assert.deepEqual(planRequests(plan), []);
	});

	it("leaves a Homepage menu staff relabelled, and creates only the menus the database lacks", () => {
		const live = feature004Model();
		live.menus = [
			{ name: "homepage-featured", label: "เรื่องเด่นหน้าแรก" },
			{ name: "primary", label: "เมนูหลัก" },
		];

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(
			plan.menus,
			HOMEPAGE_MENUS.filter(({ name }) => name !== "homepage-featured"),
		);
	});

	it("leaves a field the database has beyond the seed", () => {
		const live = feature004Model();
		collectionOf(live, "personnel").fields.push({ slug: "organization", type: "reference" });

		assert.deepEqual(planModelUpdate(seed, live).fields, []);
	});

	it("reports a seed field the database has with another type instead of changing its column", () => {
		const live = feature004Model();
		const personnel = collectionOf(live, "personnel");
		personnel.fields = [
			...feature002Fields("personnel"),
			{ slug: "leadership_order", type: "string" },
		];

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.fields, []);
		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^personnel: .*leadership_order.*string.*integer/);
	});

	it("adds only the reference terms a taxonomy lacks, and leaves the terms staff relabelled or added", () => {
		const live = feature004Model();
		taxonomyOf(live, "document_type").terms = [
			{ slug: "policy", label: "นโยบายและยุทธศาสตร์" },
			{ slug: "form", label: "แบบฟอร์ม" },
		];

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(
			plan.terms,
			DOCUMENT_TYPE_TERMS.filter(({ slug }) => slug !== "policy"),
		);
	});

	it("reports a taxonomy with reference terms that the database lacks", () => {
		const live = feature004Model();
		live.taxonomies = [];

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.terms, []);
		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^document_type: /);
	});

	it("reports a different URL pattern as a problem instead of moving the collection's addresses", () => {
		const live = feature002Model();
		collectionOf(live, "news").urlPattern = "/stories/{slug}";

		const plan = planModelUpdate(seed, live);

		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^news: .*\/stories\/\{slug\}.*\/news\/\{slug\}/);
	});

	it("adds the support values the database lacks and keeps those it has beyond the seed", () => {
		const live = feature004Model();
		Object.assign(collectionOf(live, "news"), {
			supports: [...FEATURE_002_SUPPORTS, "search"],
			hasSeo: false,
		});

		assert.deepEqual(planModelUpdate(seed, live), {
			...NOTHING,
			collections: [
				{
					slug: "news",
					update: { supports: [...FEATURE_002_SUPPORTS, "search", "seo"], hasSeo: true },
				},
			],
		});
	});
});

describe("planModelUpdate: the ITA model (spec #121)", () => {
	it("creates the block types ข้อกำหนด, หลักฐาน: ไฟล์ and หลักฐาน: ลิงก์ under the category ITA on a database without them", () => {
		const plan = planModelUpdate(seed, feature003Model());

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(
			plan.blockTypes.map(({ slug, label, category, fields }) => ({
				slug,
				label,
				category,
				fields: fields.map(contractOf),
			})),
			ITA_BLOCK_TYPES,
		);
		const link = plan.blockTypes.find(({ slug }) => slug === "ita_link");
		assert.equal(
			link?.fields.find(({ slug }) => slug === "current")?.label,
			"ข้อมูลปัจจุบัน (เปลี่ยนตามเวลา)",
		);
	});

	it("creates the MOIT collection in the Admin group ITA, routable at /ita/{slug}, with drafts, revisions, preview, scheduling and SEO", () => {
		const plan = planModelUpdate(seed, feature003Model());

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(
			plan.newCollections.map(
				({ create: { slug, label, group, supports, urlPattern, routable } }) => ({
					slug,
					label,
					group,
					supports,
					urlPattern,
					routable,
				}),
			),
			[MOIT],
		);
		assert.deepEqual(plan.collections, []);
	});

	it("creates MOIT's six fields, its Evidence a blocks field of the ITA types holding at most 100", () => {
		const fields = planModelUpdate(seed, feature003Model())
			.fields.filter(({ collection }) => collection === MOIT.slug)
			.map(({ field }) => field);

		assert.deepEqual(fields.map(contractOf), MOIT_FIELDS);
		assert.equal(fields.find(({ slug }) => slug === "updated_on")?.label, "ปรับปรุงล่าสุด");
	});

	it("sets MOIT's title as the Admin list's title once its fields exist, which lets the list sort by it", () => {
		// emdash 1.1.0 src/api/handlers/content.ts: a collection's titleField is a sort column.
		const [moit] = planModelUpdate(seed, feature003Model()).newCollections;

		assert.deepEqual(moit?.display, { titleField: "title" });
	});

	it("creates the block types first, the collection before its fields, and sets the title after them", () => {
		const requests = planRequests(planModelUpdate(seed, feature003Model()));
		const at = (method: string, path: string) =>
			requests.findIndex((request) => request.method === method && request.path === path);
		const collection = "/_emdash/api/schema/collections/moit";

		const blockTypes = requests.filter(({ path }) => path === "/_emdash/api/schema/block-types");
		const created = at("POST", "/_emdash/api/schema/collections");
		const fields = requests.flatMap((request, index) =>
			request.path === `${collection}/fields` ? [index] : [],
		);
		const title = at("PUT", collection);

		assert.equal(blockTypes.length, 3);
		assert.ok(requests.slice(0, 3).every(({ path }) => path.endsWith("/block-types")));
		assert.ok(created > 2 && fields.length === 6 && fields.every((index) => index > created));
		assert.ok(title > Math.max(...fields));
		assert.deepEqual(requests[title]?.body, { titleField: "title" });
	});

	it("updates a changed block type in place, by the fingerprint of its active version", () => {
		const live = feature004Model();
		const { blockType, version } = blockTypeOf(live, "ita_file");
		// The prototype's Round: optional, with no "ไม่ระบุรอบ".
		blockType.label = "ไฟล์";
		version.fields = version.fields.map((field) =>
			field.slug === ROUND.slug
				? { ...field, validation: { options: ["รอบ 6 เดือน", "รอบ 12 เดือน"] } }
				: field,
		);

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.problems, []);
		assert.deepEqual(plan.blockTypes, []);
		assert.equal(plan.blockTypeUpdates.length, 1);
		const [{ slug, update }] = plan.blockTypeUpdates;
		assert.equal(slug, "ita_file");
		assert.equal(update.expectedFingerprint, version.fingerprint);
		assert.equal(update.label, "หลักฐาน: ไฟล์");
		assert.equal(update.category, "ITA");
		assert.deepEqual(update.fields?.map(contractOf), ITA_BLOCK_TYPES[1]?.fields);
		assert.equal("breaking" in update, false);
	});

	it("keeps a block type the database has beyond the seed: EmDash 1.1.0 has no route that deletes one", () => {
		const live = feature004Model();
		const { blockType } = blockTypeOf(live, "ita_link");
		live.blockTypes.push({ ...blockType, slug: "proto_ita_link", category: "ITA (ต้นแบบ)" });

		assert.deepEqual(planModelUpdate(seed, live), NOTHING);
	});

	it("reports a block-type field the database has with another type instead of changing it", () => {
		const live = feature004Model();
		const { version } = blockTypeOf(live, "ita_link");
		version.fields = version.fields.map((field) =>
			field.slug === "url" ? { ...field, type: "string" } : field,
		);

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.blockTypeUpdates, []);
		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^block type ita_link: .*url.*string.*url/);
	});

	it("reports a block type whose active version is not the seed's instead of making a version", () => {
		const live = feature004Model();
		const { blockType, version } = blockTypeOf(live, "ita_requirement");
		blockType.currentVersion = 2;
		blockType.versions.push({ ...version, version: 2, fingerprint: "block-type:v1:sha256:v2" });

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan.blockTypeUpdates, []);
		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^block type ita_requirement: .*version 2.*version 1/);
	});

	it("gives MOIT's Evidence field the seed's allowed types, in the picker's order, and its limit", () => {
		const live = feature004Model();
		const evidence = collectionOf(live, MOIT.slug).fields.find(({ slug }) => slug === "evidence");
		assert.ok(evidence);
		evidence.validation = {
			allowedTypes: ["ita_file", "ita_requirement"],
			retiredTypes: ["ita_link"],
			minItems: 0,
			maxItems: 50,
		};

		const plan = planModelUpdate(seed, live);

		assert.deepEqual(plan, {
			...NOTHING,
			fieldUpdates: [{ collection: MOIT.slug, slug: "evidence", validation: EVIDENCE_VALIDATION }],
		});
		assert.deepEqual(planRequests(plan), [
			{
				change: `moit: field evidence: allowedTypes ${EVIDENCE_VALIDATION.allowedTypes.join(",")}; maxItems 100`,
				method: "PUT",
				path: "/_emdash/api/schema/collections/moit/fields/evidence",
				body: { validation: EVIDENCE_VALIDATION },
			},
		]);
	});
});

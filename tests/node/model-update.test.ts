// The model-update step's planner (#53; spec #51, "Changes to the Feature 002 model").
//
// `planModelUpdate` compares the content model of seed/seed.json with the live model that
// EmDash's schema API reports, and plans the native updates that bring the database to the
// seed's model. The step applies the plan, and the development runtime's verify check passes
// only while the plan is empty.
//
// Expected values come from `03` §15 (the canonical route table in
// tests/canonical-url-patterns.ts), `03` §5 (no per-person route) and spec #51 "Changes to the
// Feature 002 model" (the Document Type reference terms and Personnel's `leadership_order`), never
// from the seed. The live models start from the seed's own field list, as setup leaves it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	planModelUpdate,
	type LiveCollection,
	type LiveField,
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

/** The fields of a seed collection as the schema API lists them, by slug and type. */
function seedFields(slug: string): LiveField[] {
	const collection = seed.collections.find(
		(candidate: { slug: string }) => candidate.slug === slug,
	);
	assert.ok(collection, `the seed has no ${slug} collection`);
	return collection.fields.map(({ slug, type }: LiveField) => ({ slug, type }));
}

/** The fields Feature 002 gave a collection: Personnel had no Leadership order yet. */
function feature002Fields(slug: string): LiveField[] {
	return seedFields(slug).filter((field) => field.slug !== LEADERSHIP_ORDER.slug);
}

/** The ten collections as the schema API lists them on a Feature 002 database, with no terms. */
function feature002Model(): LiveModel {
	return {
		collections: [...Object.keys(CANONICAL_URL_PATTERNS), "personnel"].map((slug) => ({
			slug,
			supports: [...FEATURE_002_SUPPORTS],
			hasSeo: false,
			routable: true,
			fields: feature002Fields(slug),
		})),
		taxonomies: [{ name: "document_type", terms: [] }],
	};
}

/** The same collections once the Feature 003 model is applied. */
function feature003Model(): LiveModel {
	return {
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
	};
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
		assert.deepEqual(plan.fields, [{ collection: "personnel", field: LEADERSHIP_ORDER }]);
	});

	it("plans nothing for a database already on the model, so a second run changes nothing", () => {
		assert.deepEqual(planModelUpdate(seed, feature003Model()), {
			collections: [],
			fields: [],
			terms: [],
			problems: [],
		});
	});

	it("leaves a field the database has beyond the seed", () => {
		const live = feature003Model();
		collectionOf(live, "personnel").fields.push({ slug: "organization", type: "reference" });

		assert.deepEqual(planModelUpdate(seed, live).fields, []);
	});

	it("reports a seed field the database has with another type instead of changing its column", () => {
		const live = feature003Model();
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
		const live = feature003Model();
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
		const live = feature003Model();
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
		const live = feature003Model();
		Object.assign(collectionOf(live, "news"), {
			supports: [...FEATURE_002_SUPPORTS, "search"],
			hasSeo: false,
		});

		assert.deepEqual(planModelUpdate(seed, live), {
			collections: [
				{
					slug: "news",
					update: { supports: [...FEATURE_002_SUPPORTS, "search", "seo"], hasSeo: true },
				},
			],
			fields: [],
			terms: [],
			problems: [],
		});
	});

	it("reports a seed collection that the database lacks", () => {
		const live = feature003Model();
		live.collections = live.collections.filter(({ slug }) => slug !== "pages");

		const plan = planModelUpdate(seed, live);

		assert.equal(plan.problems.length, 1);
		assert.match(plan.problems[0], /^pages: /);
	});
});

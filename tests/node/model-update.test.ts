// The model-update step's planner (#53; spec #51, "Changes to the Feature 002 model").
//
// `planModelUpdate` compares the content model of seed/seed.json with the live model that
// EmDash's schema API reports, and plans the native updates that bring the database to the
// seed's model. The step applies the plan, and the development runtime's verify check passes
// only while the plan is empty.
//
// Expected values come from `03` §15 (the canonical route table in
// tests/canonical-url-patterns.ts) and `03` §5 (no per-person route), never from the seed.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	planModelUpdate,
	type LiveCollection,
	type LiveModel,
} from "../../scripts/model-update.mjs";
import { CANONICAL_URL_PATTERNS } from "../canonical-url-patterns.ts";

const seed = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8"));

const FEATURE_002_SUPPORTS = ["drafts", "revisions", "preview", "scheduling"];

/** The ten collections as the schema API lists them on a Feature 002 database. */
function feature002Model(): LiveModel {
	return {
		collections: [...Object.keys(CANONICAL_URL_PATTERNS), "personnel"].map((slug) => ({
			slug,
			supports: [...FEATURE_002_SUPPORTS],
			hasSeo: false,
			routable: true,
		})),
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
			})),
			{ slug: "personnel", supports: [...FEATURE_002_SUPPORTS], hasSeo: false, routable: false },
		],
	};
}

function collectionOf(model: LiveModel, slug: string): LiveCollection {
	const collection = model.collections.find((candidate) => candidate.slug === slug);
	assert.ok(collection, `the test model has no ${slug} collection`);
	return collection;
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

	it("plans nothing for a database already on the model, so a second run changes nothing", () => {
		assert.deepEqual(planModelUpdate(seed, feature003Model()), { collections: [], problems: [] });
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

// The model-update step (#53, #60, #61, #65): brings an existing database to the content model of
// seed/seed.json through EmDash's native schema, taxonomy and menu APIs, and tells whether it is
// there.
//
//   node scripts/model-update.mjs --origin <origin> [--check] < <Administrator PAT file>
//
// The native gap it fills, in emdash 1.1.0: EmDash applies the seed only at setup, and with
// `onConflict: "skip"`, so an existing collection keeps its settings
// (src/astro/routes/api/setup/index.ts and dev-bypass.ts). `emdash seed` opens only a SQLite
// file (src/cli/commands/seed.ts), and `emdash schema` cannot update a collection
// (src/cli/commands/schema.ts). Setup also skips the seed's taxonomy terms unless it installs
// sample content (src/seed/apply.ts `includeContent`). The step therefore uses the REST APIs that
// the Admin uses: GET and PUT /_emdash/api/schema/collections, GET and POST
// /_emdash/api/schema/collections/{slug}/fields (src/astro/routes/api/schema/collections/),
// GET /_emdash/api/taxonomies, GET and POST /_emdash/api/taxonomies/{name}/terms
// (src/astro/routes/api/taxonomies/), and GET and POST /_emdash/api/menus
// (src/astro/routes/api/menus/index.ts).
//
// The token is read from standard input and never printed. With --check the step only reads:
// it lists the pending changes and exits 0 when there are none and 3 when there are. Without
// it, the step applies them and reads the model again to confirm. A problem changes nothing
// and exits 1: a URL pattern the database already has, which the step never replaces because
// that would move every public address of the collection; a field the database has with another
// type, which the step never changes because that would change its stored values; or a
// collection or taxonomy the database lacks.
//
// The caller backs up first (on the development runtime, scripts/dev-runtime-model-update.sh
// does). No types need regenerating: the repository does not use EmDash's generated types, and
// in development the EmDash dev server rewrites its own emdash-env.d.ts after every schema
// change (src/schema/registry.ts notifyTypegen).

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

/**
 * @typedef {object} SeedField A field of a seed collection, which is also the body that creates it
 *   with POST /_emdash/api/schema/collections/{slug}/fields (src/seed/types.ts SeedField,
 *   src/api/schemas/schema.ts createFieldBody).
 * @property {string} slug
 * @property {string} label
 * @property {string} type
 *
 * @typedef {object} SeedCollection A collection of seed/seed.json (src/seed/types.ts).
 * @property {string} slug
 * @property {string[]} [supports]
 * @property {string} [urlPattern]
 * @property {boolean} [routable]
 * @property {SeedField[]} [fields]
 *
 * @typedef {object} SeedTaxonomy A taxonomy of seed/seed.json, with the reference terms it
 *   starts with (src/seed/types.ts SeedTaxonomyTerm).
 * @property {string} name
 * @property {{ slug: string, label: string }[]} [terms]
 *
 * @typedef {{ name: string, label: string }} SeedMenu A menu of seed/seed.json, by its name and
 *   label (src/seed/types.ts SeedMenu); the seed's menus start empty.
 *
 * @typedef {object} LiveCollection A collection as GET /_emdash/api/schema/collections lists it
 *   (src/schema/registry.ts mapCollectionRow, which leaves out an unset URL pattern).
 * @property {string} slug
 * @property {string[]} supports
 * @property {string | null} [urlPattern]
 * @property {boolean} hasSeo
 * @property {boolean} routable
 * @property {LiveField[]} fields its fields, from GET /_emdash/api/schema/collections/{slug}/fields
 *
 * @typedef {{ slug: string, type: string }} LiveField A field the database has
 *   (src/schema/registry.ts mapFieldRow).
 *
 * @typedef {object} LiveTaxonomy A taxonomy the database has, with the slug and label of each of
 *   its terms (GET /_emdash/api/taxonomies/{name}/terms, src/api/handlers/taxonomies.ts).
 * @property {string} name
 * @property {{ slug: string, label: string }[]} terms
 *
 * @typedef {{ name: string, label: string }} LiveMenu A menu the database has, as
 *   GET /_emdash/api/menus lists it (src/api/handlers/menus.ts handleMenuList).
 *
 * @typedef {{ collections: LiveCollection[], taxonomies: LiveTaxonomy[], menus: LiveMenu[] }}
 *   LiveModel
 *
 * @typedef {{ collection: string, field: SeedField }} FieldCreate A field to create in a
 *   collection.
 *
 * @typedef {{ taxonomy: string, slug: string, label: string }} TermCreate A term to create with
 *   POST /_emdash/api/taxonomies/{taxonomy}/terms (src/api/schemas/taxonomies.ts createTermBody).
 *
 * @typedef {{ name: string, label: string }} MenuCreate A menu to create, empty, with
 *   POST /_emdash/api/menus (src/api/schemas/menus.ts createMenuBody).
 *
 * @typedef {object} CollectionUpdate Settings for PUT /_emdash/api/schema/collections/{slug}
 *   (src/api/schemas/schema.ts updateCollectionBody).
 * @property {string} [urlPattern]
 * @property {string[]} [supports]
 * @property {boolean} [hasSeo]
 * @property {boolean} [routable]
 */

/**
 * Plan the updates that bring the live content model to the seed's.
 *
 * For each collection the seed declares, the step manages three settings and leaves the rest
 * of the collection as it is:
 * - the URL pattern is set when the database has none;
 * - the seed's `supports` values that the database lacks are added, and none is removed;
 *   SEO also sets `hasSeo`, which the native sitemap reads (src/api/handlers/seo.ts
 *   handleSitemapData);
 * - routability is set to the seed's value, routable unless the seed says otherwise.
 *
 * The seed's fields that a collection lacks, such as Personnel's Leadership order, are created as
 * the seed declares them. A field the database has beyond the seed is kept.
 *
 * For each taxonomy the seed gives reference terms, such as the Document Types the About pages
 * list by, the step adds the terms whose slug the taxonomy lacks. A term staff relabelled keeps
 * its label, and no term is removed.
 *
 * The seed's menus, such as the Homepage menus staff curate, are created empty where the database
 * has no menu of that name. A menu staff relabelled keeps its label, and no menu or item is
 * touched.
 *
 * @param {{ collections: SeedCollection[], taxonomies?: SeedTaxonomy[], menus?: SeedMenu[] }} seed
 *   the parsed seed/seed.json
 * @param {LiveModel} live the live model
 * @returns {{
 *   collections: { slug: string, update: CollectionUpdate }[],
 *   fields: FieldCreate[],
 *   terms: TermCreate[],
 *   menus: MenuCreate[],
 *   problems: string[],
 * }}
 */
export function planModelUpdate(seed, live) {
	const current = new Map(live.collections.map((collection) => [collection.slug, collection]));
	/** @type {{ slug: string, update: CollectionUpdate }[]} */
	const collections = [];
	/** @type {FieldCreate[]} */
	const fields = [];
	/** @type {string[]} */
	const problems = [];
	for (const wanted of seed.collections) {
		const have = current.get(wanted.slug);
		if (have === undefined) {
			problems.push(`${wanted.slug}: the database has no such collection`);
			continue;
		}
		/** @type {CollectionUpdate} */
		const update = {};
		if (wanted.urlPattern !== undefined && wanted.urlPattern !== have.urlPattern) {
			if (have.urlPattern) {
				problems.push(
					`${wanted.slug}: the database has the URL pattern ${have.urlPattern}, the seed ${wanted.urlPattern}`,
				);
			} else {
				update.urlPattern = wanted.urlPattern;
			}
		}
		const missing = (wanted.supports ?? []).filter((value) => !have.supports.includes(value));
		if (missing.length > 0) {
			update.supports = [...have.supports, ...missing];
		}
		if (wanted.supports?.includes("seo") && !have.hasSeo) {
			update.hasSeo = true;
		}
		const routable = wanted.routable ?? true;
		if (have.routable !== routable) {
			update.routable = routable;
		}
		if (Object.keys(update).length > 0) {
			collections.push({ slug: wanted.slug, update });
		}
		const types = new Map(have.fields.map((field) => [field.slug, field.type]));
		for (const field of wanted.fields ?? []) {
			const type = types.get(field.slug);
			if (type === undefined) {
				fields.push({ collection: wanted.slug, field });
			} else if (type !== field.type) {
				problems.push(
					`${wanted.slug}: the database has the field ${field.slug} as ${type}, the seed as ${field.type}`,
				);
			}
		}
	}
	const taxonomies = new Map(live.taxonomies.map((taxonomy) => [taxonomy.name, taxonomy]));
	/** @type {TermCreate[]} */
	const terms = [];
	for (const wanted of seed.taxonomies ?? []) {
		if (!wanted.terms?.length) continue;
		const have = taxonomies.get(wanted.name);
		if (have === undefined) {
			problems.push(`${wanted.name}: the database has no such taxonomy`);
			continue;
		}
		const slugs = new Set(have.terms.map((term) => term.slug));
		for (const { slug, label } of wanted.terms) {
			if (!slugs.has(slug)) terms.push({ taxonomy: wanted.name, slug, label });
		}
	}
	const menuNames = new Set(live.menus.map((menu) => menu.name));
	const menus = (seed.menus ?? [])
		.filter(({ name }) => !menuNames.has(name))
		.map(({ name, label }) => ({ name, label }));
	return { collections, fields, terms, menus, problems };
}

/**
 * Whether a plan changes nothing.
 *
 * @param {ReturnType<typeof planModelUpdate>} plan
 */
function isEmpty({ collections, fields, terms, menus }) {
	return (
		collections.length === 0 && fields.length === 0 && terms.length === 0 && menus.length === 0
	);
}

const USAGE = "usage: node scripts/model-update.mjs --origin <origin> [--check] < <PAT file>";

/** Exit statuses. PENDING is --check finding changes to apply. */
const EXIT = { MATCHES: 0, FAILED: 1, USAGE: 2, PENDING: 3 };

/** @param {CollectionUpdate} update */
function describe(update) {
	return Object.entries(update)
		.map(([setting, value]) => `${setting} ${Array.isArray(value) ? value.join(",") : value}`)
		.join("; ");
}

/**
 * Every term of a term list, children included: a hierarchical taxonomy lists its terms as a tree
 * (src/api/handlers/taxonomies.ts handleTermList).
 *
 * @param {{ slug: string, label: string, children?: unknown[] }[]} terms
 * @returns {{ slug: string, label: string }[]}
 */
function flattenTerms(terms) {
	return terms.flatMap(({ slug, label, children = [] }) => [
		{ slug, label },
		...flattenTerms(/** @type {typeof terms} */ (children)),
	]);
}

/** @param {string} line */
function say(line) {
	console.log(`model-update: ${line}`);
}

/**
 * An error's message followed by its causes: fetch reports why a request failed in `cause`.
 *
 * @param {unknown} error
 * @returns {string}
 */
function failureText(error) {
	if (!(error instanceof Error)) return String(error);
	return error.cause === undefined
		? error.message
		: `${error.message}: ${failureText(error.cause)}`;
}

async function readStandardInput() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString("utf8").trim();
}

/**
 * A client for EmDash's native REST API at `origin`, authenticated with `token`. A refusal
 * throws with its status and native error code.
 *
 * @param {string} origin
 * @param {string} token
 */
function nativeApi(origin, token) {
	/**
	 * @param {string} method
	 * @param {string} path
	 * @param {unknown} [body]
	 */
	return async function call(method, path, body) {
		const response = await fetch(new URL(path, origin), {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				...(body === undefined ? {} : { "Content-Type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			redirect: "error",
		});
		const text = await response.text();
		let payload;
		try {
			payload = JSON.parse(text);
		} catch {
			payload = undefined;
		}
		if (!response.ok) {
			const error = payload?.error ?? {};
			throw new Error(
				`${method} ${path} answered ${response.status} ${error.code ?? ""} ${error.message ?? ""}`.trim(),
			);
		}
		return payload?.data;
	};
}

/** @param {string[]} args */
async function main(args) {
	let options;
	try {
		({ values: options } = parseArgs({
			args,
			options: { origin: { type: "string" }, check: { type: "boolean", default: false } },
		}));
	} catch {
		options = undefined;
	}
	if (options?.origin === undefined || process.stdin.isTTY) {
		console.error(USAGE);
		return EXIT.USAGE;
	}
	const token = await readStandardInput();
	if (token === "") {
		console.error("model-update: no token on standard input");
		return EXIT.USAGE;
	}
	try {
		const seed = JSON.parse(await readFile(new URL("../seed/seed.json", import.meta.url), "utf8"));
		const api = nativeApi(options.origin, token);
		/** @returns {Promise<LiveModel>} */
		const readModel = async () => {
			const existing = new Set(
				(await api("GET", "/_emdash/api/taxonomies")).taxonomies.map(
					(/** @type {{ name: string }} */ taxonomy) => taxonomy.name,
				),
			);
			/** @type {LiveTaxonomy[]} */
			const taxonomies = [];
			for (const { name, terms } of seed.taxonomies ?? []) {
				if (!terms?.length || !existing.has(name)) continue;
				const listed = await api(
					"GET",
					`/_emdash/api/taxonomies/${encodeURIComponent(name)}/terms?includeCounts=false`,
				);
				taxonomies.push({ name, terms: flattenTerms(listed.terms) });
			}
			const wanted = new Set(
				seed.collections.map((/** @type {SeedCollection} */ { slug }) => slug),
			);
			/** @type {LiveCollection[]} */
			const collections = [];
			for (const collection of (await api("GET", "/_emdash/api/schema/collections")).items) {
				if (!wanted.has(collection.slug)) continue;
				const listed = await api(
					"GET",
					`/_emdash/api/schema/collections/${encodeURIComponent(collection.slug)}/fields`,
				);
				collections.push({
					...collection,
					fields: listed.items.map((/** @type {LiveField} */ { slug, type }) => ({ slug, type })),
				});
			}
			/** @type {LiveMenu[]} */
			const menus = (await api("GET", "/_emdash/api/menus")).map(
				(/** @type {LiveMenu} */ { name, label }) => ({ name, label }),
			);
			return { collections, taxonomies, menus };
		};

		const plan = planModelUpdate(seed, await readModel());
		for (const problem of plan.problems) say(`PROBLEM: ${problem}`);
		if (plan.problems.length > 0) {
			say("nothing was changed");
			return EXIT.FAILED;
		}
		if (isEmpty(plan)) {
			say("the database has the seed's content model; nothing to change");
			return EXIT.MATCHES;
		}
		for (const { slug, update } of plan.collections) {
			if (options.check) {
				say(`pending: ${slug}: ${describe(update)}`);
			} else {
				await api("PUT", `/_emdash/api/schema/collections/${encodeURIComponent(slug)}`, update);
				say(`applied: ${slug}: ${describe(update)}`);
			}
		}
		for (const { collection, field } of plan.fields) {
			const change = `${collection}: field ${field.slug} (${field.type}, ${field.label})`;
			if (options.check) {
				say(`pending: ${change}`);
			} else {
				await api(
					"POST",
					`/_emdash/api/schema/collections/${encodeURIComponent(collection)}/fields`,
					field,
				);
				say(`applied: ${change}`);
			}
		}
		for (const { taxonomy, slug, label } of plan.terms) {
			if (options.check) {
				say(`pending: ${taxonomy}: term ${slug} (${label})`);
			} else {
				await api("POST", `/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms`, {
					slug,
					label,
				});
				say(`applied: ${taxonomy}: term ${slug} (${label})`);
			}
		}
		for (const { name, label } of plan.menus) {
			if (options.check) {
				say(`pending: menu ${name} (${label})`);
			} else {
				await api("POST", "/_emdash/api/menus", { name, label });
				say(`applied: menu ${name} (${label})`);
			}
		}
		if (options.check) {
			return EXIT.PENDING;
		}
		const after = planModelUpdate(seed, await readModel());
		if (after.problems.length > 0 || !isEmpty(after)) {
			say("FAIL: the database still differs from the seed after the update");
			return EXIT.FAILED;
		}
		say("the database has the seed's content model");
		return EXIT.MATCHES;
	} catch (error) {
		say(`FAIL: ${failureText(error).replaceAll(token, "[token]")}`);
		return EXIT.FAILED;
	}
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2));
}

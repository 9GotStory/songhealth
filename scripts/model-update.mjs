// The model-update step (#53, #60, #61, #65, #122): brings an existing database to the content
// model of seed/seed.json through EmDash's native schema, taxonomy and menu APIs, and tells whether
// it is there.
//
//   node scripts/model-update.mjs --origin <origin> [--check] < <Administrator PAT file>
//
// The native gap it fills, in emdash 1.1.0: EmDash applies the seed only at setup, and with
// `onConflict: "skip"`, so an existing collection or block type keeps its settings
// (src/astro/routes/api/setup/index.ts, which refuses once setup is complete). `setup/dev-bypass`
// applies it again the same way and adds what is missing, but it answers only in development and
// empties the seed's menus (dev-bypass.ts, src/seed/apply.ts). `emdash seed` opens only a SQLite
// file (src/cli/commands/seed.ts), and `emdash schema` cannot update a collection
// (src/cli/commands/schema.ts). Setup also skips the seed's taxonomy terms unless it
// installs sample content (src/seed/apply.ts `includeContent`). The step therefore uses the REST
// APIs that the Admin uses: GET, POST and PUT /_emdash/api/schema/block-types and
// /_emdash/api/schema/block-types/{slug} (src/astro/routes/api/schema/block-types/), GET, POST and
// PUT /_emdash/api/schema/collections, /_emdash/api/schema/collections/{slug}/fields and their
// items (src/astro/routes/api/schema/collections/), GET /_emdash/api/taxonomies, GET and POST
// /_emdash/api/taxonomies/{name}/terms (src/astro/routes/api/taxonomies/), and GET and POST
// /_emdash/api/menus (src/astro/routes/api/menus/index.ts).
//
// The token is read from standard input and never printed. With --check the step only reads: it
// lists the pending changes and exits 0 when there are none and 3 when there are. Without it, the
// step applies them and reads the model again to confirm. A problem changes nothing and exits 1:
// - a URL pattern the database already has, which the step never replaces because that would move
//   every public address of the collection;
// - a field, or a block type's field, that the database has with another type, which the step
//   never changes because that would change its stored values;
// - a block type whose active version is not the seed's current one, because the step makes and
//   activates no version;
// - a taxonomy the database lacks.
// EmDash itself refuses a block-type change that would break the blocks already stored
// (src/schema/block-type-registry.ts updateBlockType, BLOCK_TYPE_BREAKING_CHANGE). The step never
// asks for one and updates block types first, so that refusal stops it before it changes any
// collection, field, term or menu.
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
 * @property {boolean} [required]
 * @property {Record<string, unknown>} [validation]
 *
 * @typedef {object} SeedCollection A collection of seed/seed.json (src/seed/types.ts).
 * @property {string} slug
 * @property {string} label
 * @property {string[]} [supports]
 * @property {string} [urlPattern]
 * @property {boolean} [routable]
 * @property {string} [titleField]
 * @property {string} [dateField]
 * @property {SeedField[]} [fields]
 *
 * @typedef {object} BlockField A field of a block type's version (src/schema/block-types.ts
 *   BlockFieldDefinition).
 * @property {string} slug
 * @property {string} label
 * @property {string} type
 * @property {boolean} [required]
 * @property {unknown} [defaultValue]
 * @property {Record<string, unknown>} [validation]
 *
 * @typedef {object} SeedBlockType A block type of seed/seed.json, with the versions of its fields
 *   (src/seed/types.ts SeedBlockType).
 * @property {string} slug
 * @property {string} label
 * @property {string} [description]
 * @property {string} [icon]
 * @property {string} [category]
 * @property {number} currentVersion
 * @property {{ version: number, fields: BlockField[] }[]} versions
 *
 * @typedef {object} SeedTaxonomy A taxonomy of seed/seed.json, with the reference terms it
 *   starts with (src/seed/types.ts SeedTaxonomyTerm).
 * @property {string} name
 * @property {{ slug: string, label: string }[]} [terms]
 *
 * @typedef {{ name: string, label: string }} SeedMenu A menu of seed/seed.json, by its name and
 *   label (src/seed/types.ts SeedMenu); the seed's menus start empty.
 *
 * @typedef {object} LiveBlockType A block type as GET /_emdash/api/schema/block-types lists it,
 *   each version with the fingerprint of its fields (src/schema/block-type-registry.ts
 *   mapBlockType, which leaves out an unset description, icon or category).
 * @property {string} slug
 * @property {string} label
 * @property {string} [description]
 * @property {string} [icon]
 * @property {string} [category]
 * @property {number} currentVersion
 * @property {{ version: number, fields: BlockField[], fingerprint: string }[]} versions
 *
 * @typedef {object} LiveCollection A collection as GET /_emdash/api/schema/collections lists it
 *   (src/schema/registry.ts mapCollectionRow, which leaves out an unset URL pattern, title field or
 *   date field).
 * @property {string} slug
 * @property {string[]} supports
 * @property {string | null} [urlPattern]
 * @property {boolean} hasSeo
 * @property {boolean} routable
 * @property {string | null} [titleField]
 * @property {string | null} [dateField]
 * @property {LiveField[]} fields its fields, from GET /_emdash/api/schema/collections/{slug}/fields
 *
 * @typedef {object} LiveField A field the database has (src/schema/registry.ts mapFieldRow).
 * @property {string} slug
 * @property {string} type
 * @property {Record<string, unknown> | null} [validation]
 *
 * @typedef {object} LiveTaxonomy A taxonomy the database has, with the slug and label of each of
 *   its terms (GET /_emdash/api/taxonomies/{name}/terms, src/api/handlers/taxonomies.ts).
 * @property {string} name
 * @property {{ slug: string, label: string }[]} terms
 *
 * @typedef {{ name: string, label: string }} LiveMenu A menu the database has, as
 *   GET /_emdash/api/menus lists it (src/api/handlers/menus.ts handleMenuList).
 *
 * @typedef {object} LiveModel
 * @property {LiveBlockType[]} blockTypes
 * @property {LiveCollection[]} collections
 * @property {LiveTaxonomy[]} taxonomies
 * @property {LiveMenu[]} menus
 *
 * @typedef {object} BlockTypeCreate A block type to create with
 *   POST /_emdash/api/schema/block-types (src/api/schemas/schema.ts createBlockTypeBody).
 * @property {string} slug
 * @property {string} label
 * @property {string} [description]
 * @property {string} [icon]
 * @property {string} [category]
 * @property {BlockField[]} fields
 *
 * @typedef {object} BlockTypeUpdate A block type's definition for
 *   PUT /_emdash/api/schema/block-types/{slug} (src/api/schemas/schema.ts updateBlockTypeBody),
 *   which rewrites its active version in place while that version still has the fingerprint read
 *   (src/schema/block-type-registry.ts updateBlockType).
 * @property {string} expectedFingerprint
 * @property {string} label
 * @property {string | null} description
 * @property {string | null} icon
 * @property {string | null} category
 * @property {BlockField[]} [fields]
 *
 * @typedef {{ slug: string, label: string, routable: boolean, [setting: string]: unknown }}
 *   CollectionCreate A collection to create, without fields, with
 *   POST /_emdash/api/schema/collections (src/api/schemas/schema.ts createCollectionBody).
 *
 * @typedef {{ collection: string, field: SeedField }} FieldCreate A field to create in a
 *   collection.
 *
 * @typedef {{ collection: string, slug: string, validation: Record<string, unknown> }} FieldUpdate
 *   A blocks field's validation for PUT /_emdash/api/schema/collections/{slug}/fields/{field}
 *   (src/api/schemas/schema.ts updateFieldBody).
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
 * @property {string} [titleField]
 * @property {string} [dateField]
 *
 * @typedef {{ change: string, method: string, path: string, body: unknown }} NativeRequest A
 *   request that applies one change, with the line that names the change.
 */

/**
 * A value's JSON with every object's keys in order, so two definitions compare by content: EmDash
 * stores a block type's fields as its route parsed them, with their keys in the order of
 * src/api/schemas/schema.ts blockFieldDefinitionSchema rather than the seed's.
 *
 * @param {unknown} value
 * @returns {string | undefined}
 */
function canonical(value) {
	return JSON.stringify(value, (_key, item) =>
		item !== null && typeof item === "object" && !Array.isArray(item)
			? Object.fromEntries(
					Object.entries(item).toSorted(([left], [right]) =>
						left < right ? -1 : left > right ? 1 : 0,
					),
				)
			: item,
	);
}

/**
 * The problem of a field that the database has with another type than the seed's: the step never
 * changes a type, because that would change what the stored values mean.
 *
 * @param {string} owner the collection or the block type
 * @param {string} field
 * @param {string | undefined} stored
 * @param {string} wanted
 */
function retypedField(owner, field, stored, wanted) {
	return `${owner}: the database has the field ${field} as ${stored}, the seed as ${wanted}`;
}

/**
 * Plan the block types: the seed's block types the database lacks are created, and those whose
 * definition differs are updated in place by the fingerprint of their active version. The whole
 * definition is compared, because a fingerprint leaves out the labels
 * (src/schema/block-type-contract.ts fingerprintBlockFields). A block type whose active version is
 * not the seed's current one, or that has a field of the seed's with another type, is a problem.
 * None is deleted: EmDash 1.1.0 has no route that deletes one (the routes under
 * src/astro/routes/api/schema/block-types/ answer GET, POST and PUT only), so a block type the
 * database has beyond the seed is kept.
 *
 * @param {SeedBlockType[]} wanted
 * @param {LiveBlockType[]} have
 * @param {string[]} problems
 */
function planBlockTypes(wanted, have, problems) {
	const current = new Map(have.map((blockType) => [blockType.slug, blockType]));
	/** @type {BlockTypeCreate[]} */
	const blockTypes = [];
	/** @type {{ slug: string, update: BlockTypeUpdate }[]} */
	const blockTypeUpdates = [];
	for (const { slug, currentVersion, versions, ...metadata } of wanted) {
		const fields = versions.find(({ version }) => version === currentVersion)?.fields ?? [];
		const existing = current.get(slug);
		if (existing === undefined) {
			blockTypes.push({ slug, ...metadata, fields });
			continue;
		}
		const active = existing.versions.find(({ version }) => version === existing.currentVersion);
		if (active === undefined || existing.currentVersion !== currentVersion) {
			problems.push(
				`block type ${slug}: the database has version ${existing.currentVersion}, the seed version ${currentVersion}`,
			);
			continue;
		}
		const types = new Map(active.fields.map((field) => [field.slug, field.type]));
		const retyped = fields.filter(
			(field) => types.has(field.slug) && types.get(field.slug) !== field.type,
		);
		for (const field of retyped) {
			problems.push(
				retypedField(`block type ${slug}`, field.slug, types.get(field.slug), field.type),
			);
		}
		const { label, description, icon, category } = existing;
		if (
			retyped.length === 0 &&
			canonical({ ...metadata, fields }) !==
				canonical({ label, description, icon, category, fields: active.fields })
		) {
			blockTypeUpdates.push({
				slug,
				update: {
					expectedFingerprint: active.fingerprint,
					label: metadata.label,
					description: metadata.description ?? null,
					icon: metadata.icon ?? null,
					category: metadata.category ?? null,
					fields,
				},
			});
		}
	}
	return { blockTypes, blockTypeUpdates };
}

/**
 * A seed collection the database lacks, created as setup creates it: with the seed's settings, the
 * source "seed", and routable unless the seed says otherwise (src/seed/apply.ts, the
 * createSeedCollection call). Its title and date fields name its fields, so they wait for them,
 * as setup's do (applyDisplayDateFields).
 *
 * @param {SeedCollection} collection
 * @returns {CollectionCreate}
 */
function newCollection({
	fields: _fields,
	titleField: _titleField,
	dateField: _dateField,
	routable = true,
	...settings
}) {
	return { ...settings, routable, source: "seed" };
}

/**
 * Plan the updates that bring the live content model to the seed's.
 *
 * Block types come first, as `planBlockTypes` plans them, because a blocks field may only name
 * block types the database has (src/schema/registry.ts normalizeBlocksFieldValidation).
 *
 * A seed collection the database lacks, such as MOIT, is created with all of its fields. For each
 * collection the database has, the step manages these settings and leaves the rest of the
 * collection as it is:
 * - the URL pattern is set when the database has none;
 * - the seed's `supports` values that the database lacks are added, and none is removed;
 *   SEO also sets `hasSeo`, which the native sitemap reads (src/api/handlers/seo.ts
 *   handleSitemapData);
 * - routability is set to the seed's value, routable unless the seed says otherwise.
 * The title and date fields, which the Admin list shows and sorts by (src/api/handlers/content.ts),
 * are set when the database has none, a new collection's included, so a run cut short after it
 * created a collection still gives it them.
 *
 * The seed's fields that a collection lacks, such as Personnel's Leadership order, are created as
 * the seed declares them. A field the database has beyond the seed is kept. A blocks field whose
 * allowed types or item limits differ from what the seed states gets the seed's: EmDash completes
 * that validation when it stores it (normalizeBlocksFieldValidation), and the Admin's block picker
 * offers the types in their order (@emdash-cms/admin 1.1.0 dist/index.js BlocksField).
 *
 * For each taxonomy the seed gives reference terms, such as the Document Types the About pages
 * list by, the step adds the terms whose slug the taxonomy lacks. A term staff relabelled keeps
 * its label, and no term is removed.
 *
 * The seed's menus, such as the Homepage menus staff curate, are created empty where the database
 * has no menu of that name. A menu staff relabelled keeps its label, and no menu or item is
 * touched.
 *
 * @param {{
 *   collections: SeedCollection[],
 *   blockTypes?: SeedBlockType[],
 *   taxonomies?: SeedTaxonomy[],
 *   menus?: SeedMenu[],
 * }} seed the parsed seed/seed.json
 * @param {LiveModel} live the live model
 * @returns {{
 *   blockTypes: BlockTypeCreate[],
 *   blockTypeUpdates: { slug: string, update: BlockTypeUpdate }[],
 *   newCollections: CollectionCreate[],
 *   collections: { slug: string, update: CollectionUpdate }[],
 *   fields: FieldCreate[],
 *   fieldUpdates: FieldUpdate[],
 *   terms: TermCreate[],
 *   menus: MenuCreate[],
 *   problems: string[],
 * }}
 */
export function planModelUpdate(seed, live) {
	/** @type {string[]} */
	const problems = [];
	const { blockTypes, blockTypeUpdates } = planBlockTypes(
		seed.blockTypes ?? [],
		live.blockTypes,
		problems,
	);
	const current = new Map(live.collections.map((collection) => [collection.slug, collection]));
	/** @type {CollectionCreate[]} */
	const newCollections = [];
	/** @type {{ slug: string, update: CollectionUpdate }[]} */
	const collections = [];
	/** @type {FieldCreate[]} */
	const fields = [];
	/** @type {FieldUpdate[]} */
	const fieldUpdates = [];
	for (const wanted of seed.collections) {
		const have = current.get(wanted.slug);
		/** @type {CollectionUpdate} */
		const update = {};
		if (have === undefined) {
			newCollections.push(newCollection(wanted));
		} else {
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
		}
		if (wanted.titleField !== undefined && !have?.titleField) {
			update.titleField = wanted.titleField;
		}
		if (wanted.dateField !== undefined && !have?.dateField) {
			update.dateField = wanted.dateField;
		}
		if (Object.keys(update).length > 0) {
			collections.push({ slug: wanted.slug, update });
		}
		const existing = new Map((have?.fields ?? []).map((field) => [field.slug, field]));
		for (const field of wanted.fields ?? []) {
			const stored = existing.get(field.slug);
			if (stored === undefined) {
				fields.push({ collection: wanted.slug, field });
			} else if (stored.type !== field.type) {
				problems.push(retypedField(wanted.slug, field.slug, stored.type, field.type));
			} else if (
				field.type === "blocks" &&
				Object.entries(field.validation ?? {}).some(
					([key, value]) => canonical(value) !== canonical(stored.validation?.[key]),
				)
			) {
				fieldUpdates.push({
					collection: wanted.slug,
					slug: field.slug,
					validation: field.validation ?? {},
				});
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
	return {
		blockTypes,
		blockTypeUpdates,
		newCollections,
		collections,
		fields,
		fieldUpdates,
		terms,
		menus,
		problems,
	};
}

/** @param {Record<string, unknown>} settings */
function describe(settings) {
	return Object.entries(settings)
		.map(([setting, value]) => `${setting} ${Array.isArray(value) ? value.join(",") : value}`)
		.join("; ");
}

/**
 * The requests that apply a plan, in the order EmDash needs: the block types before the blocks
 * field that names them, a collection before its fields, and its settings after them, since its
 * title and date fields must name fields it has. Block-type updates go first, so EmDash's refusal
 * of a breaking one stops the step before anything else changes.
 *
 * @param {ReturnType<typeof planModelUpdate>} plan
 * @returns {NativeRequest[]}
 */
export function planRequests(plan) {
	const blockTypes = "/_emdash/api/schema/block-types";
	/** @param {string} slug */
	const collection = (slug) => `/_emdash/api/schema/collections/${encodeURIComponent(slug)}`;
	return [
		...plan.blockTypeUpdates.map(({ slug, update }) => ({
			change: `block type ${slug} (${update.label}): update in place`,
			method: "PUT",
			path: `${blockTypes}/${encodeURIComponent(slug)}`,
			body: update,
		})),
		...plan.blockTypes.map((blockType) => ({
			change: `block type ${blockType.slug} (${blockType.label})`,
			method: "POST",
			path: blockTypes,
			body: blockType,
		})),
		...plan.newCollections.map((created) => ({
			change: `${created.slug}: collection (${created.label})`,
			method: "POST",
			path: "/_emdash/api/schema/collections",
			body: created,
		})),
		...plan.fields.map(({ collection: slug, field }) => ({
			change: `${slug}: field ${field.slug} (${field.type}, ${field.label})`,
			method: "POST",
			path: `${collection(slug)}/fields`,
			body: field,
		})),
		...plan.fieldUpdates.map(({ collection: slug, slug: field, validation }) => ({
			change: `${slug}: field ${field}: ${describe(validation)}`,
			method: "PUT",
			path: `${collection(slug)}/fields/${encodeURIComponent(field)}`,
			body: { validation },
		})),
		...plan.collections.map(({ slug, update }) => ({
			change: `${slug}: ${describe(update)}`,
			method: "PUT",
			path: collection(slug),
			body: update,
		})),
		...plan.terms.map(({ taxonomy, slug, label }) => ({
			change: `${taxonomy}: term ${slug} (${label})`,
			method: "POST",
			path: `/_emdash/api/taxonomies/${encodeURIComponent(taxonomy)}/terms`,
			body: { slug, label },
		})),
		...plan.menus.map(({ name, label }) => ({
			change: `menu ${name} (${label})`,
			method: "POST",
			path: "/_emdash/api/menus",
			body: { name, label },
		})),
	];
}

const USAGE = "usage: node scripts/model-update.mjs --origin <origin> [--check] < <PAT file>";

/** Exit statuses. PENDING is --check finding changes to apply. */
const EXIT = { MATCHES: 0, FAILED: 1, USAGE: 2, PENDING: 3 };

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
			/** @type {LiveBlockType[]} */
			const blockTypes = (await api("GET", "/_emdash/api/schema/block-types")).items;
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
					fields: listed.items.map((/** @type {LiveField} */ { slug, type, validation }) => ({
						slug,
						type,
						validation,
					})),
				});
			}
			/** @type {LiveMenu[]} */
			const menus = (await api("GET", "/_emdash/api/menus")).map(
				(/** @type {LiveMenu} */ { name, label }) => ({ name, label }),
			);
			return { blockTypes, collections, taxonomies, menus };
		};

		const plan = planModelUpdate(seed, await readModel());
		for (const problem of plan.problems) say(`PROBLEM: ${problem}`);
		if (plan.problems.length > 0) {
			say("nothing was changed");
			return EXIT.FAILED;
		}
		const requests = planRequests(plan);
		if (requests.length === 0) {
			say("the database has the seed's content model; nothing to change");
			return EXIT.MATCHES;
		}
		for (const { change, method, path, body } of requests) {
			if (options.check) {
				say(`pending: ${change}`);
			} else {
				await api(method, path, body);
				say(`applied: ${change}`);
			}
		}
		if (options.check) {
			return EXIT.PENDING;
		}
		const after = planModelUpdate(seed, await readModel());
		if (after.problems.length > 0 || planRequests(after).length > 0) {
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

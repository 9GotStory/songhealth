// The model-update step (#53): brings an existing database to the content model of
// seed/seed.json through EmDash's native schema API, and tells whether it is there.
//
//   node scripts/model-update.mjs --origin <origin> [--check] < <Administrator PAT file>
//
// The seed applies only when EmDash sets up a fresh database, so a database set up from an
// earlier seed gets the later model from this step. The token is read from standard input
// and never printed. With --check the step only reads: it lists the pending changes and exits
// 0 when there are none and 3 when there are. Without it, the step applies them and reads the
// model again to confirm. A problem changes nothing and exits 1: a URL pattern the database
// already has, which the step never replaces because that would move every public address
// of the collection, or a collection the database lacks.
//
// The caller backs up first (on the development runtime, scripts/dev-runtime-model-update.sh
// does). No types need regenerating: the repository does not use EmDash's generated types, and
// in development the EmDash dev server rewrites its own emdash-env.d.ts after every schema
// change (emdash 1.1.0 src/schema/registry.ts notifyTypegen).

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

/**
 * @typedef {object} SeedCollection A collection of seed/seed.json.
 * @property {string} slug
 * @property {string[]} [supports]
 * @property {string} [urlPattern]
 * @property {boolean} [routable]
 *
 * @typedef {object} LiveCollection A collection as GET /_emdash/api/schema/collections lists it.
 * @property {string} slug
 * @property {string[]} supports
 * @property {string | null} [urlPattern]
 * @property {boolean} hasSeo
 * @property {boolean} routable
 *
 * @typedef {object} CollectionUpdate The body of PUT /_emdash/api/schema/collections/{slug}.
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
 *   SEO also sets `hasSeo`, which the native sitemap reads;
 * - routability is set to the seed's value, routable unless the seed says otherwise.
 *
 * @param {{ collections: SeedCollection[] }} seed the parsed seed/seed.json
 * @param {{ collections: LiveCollection[] }} live the live model
 * @returns {{ collections: { slug: string, update: CollectionUpdate }[], problems: string[] }}
 */
export function planModelUpdate(seed, live) {
	const current = new Map(live.collections.map((collection) => [collection.slug, collection]));
	/** @type {{ slug: string, update: CollectionUpdate }[]} */
	const collections = [];
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
	}
	return { collections, problems };
}

const USAGE = "usage: node scripts/model-update.mjs --origin <origin> [--check] < <PAT file>";
const PENDING = 3;

/** @param {CollectionUpdate} update */
function describe(update) {
	return Object.entries(update)
		.map(([setting, value]) => `${setting} ${Array.isArray(value) ? value.join(",") : value}`)
		.join("; ");
}

/** @param {string} line */
function say(line) {
	console.log(`model-update: ${line}`);
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
	return async (/** @type {string} */ method, /** @type {string} */ path, body) => {
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
		return 2;
	}
	const token = await readStandardInput();
	if (token === "") {
		console.error("model-update: no token on standard input");
		return 2;
	}
	try {
		const seed = JSON.parse(await readFile(new URL("../seed/seed.json", import.meta.url), "utf8"));
		const api = nativeApi(options.origin, token);
		const readModel = async () => ({
			collections: (await api("GET", "/_emdash/api/schema/collections")).items,
		});

		const plan = planModelUpdate(seed, await readModel());
		for (const problem of plan.problems) say(`PROBLEM: ${problem}`);
		if (plan.problems.length > 0) {
			say("nothing was changed");
			return 1;
		}
		if (plan.collections.length === 0) {
			say("the database has the seed's content model; nothing to change");
			return 0;
		}
		for (const { slug, update } of plan.collections) {
			if (options.check) {
				say(`pending: ${slug}: ${describe(update)}`);
			} else {
				await api("PUT", `/_emdash/api/schema/collections/${encodeURIComponent(slug)}`, update);
				say(`applied: ${slug}: ${describe(update)}`);
			}
		}
		if (options.check) {
			return PENDING;
		}
		const after = planModelUpdate(seed, await readModel());
		if (after.problems.length > 0 || after.collections.length > 0) {
			say("FAIL: the database still differs from the seed after the update");
			return 1;
		}
		say("the database has the seed's content model");
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		say(`FAIL: ${message.replaceAll(token, "[token]")}`);
		return 1;
	}
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2));
}

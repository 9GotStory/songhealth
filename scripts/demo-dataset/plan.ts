// What the demo dataset's commands change (#66; spec #51 "Demo dataset"). scripts/demo-dataset.ts
// reads the development runtime into a LiveState, plans with these functions, applies the plan, and
// plans again to confirm. The module imports nothing at run time, so node:test checks it directly
// (tests/node/demo-dataset.test.ts).

/** What starts the slug of everything the dataset makes, the reserved Basic Pages aside. */
export const DEMO_PREFIX = "demo-";

/** What starts the title of every entry the dataset makes. */
export const DEMO_MARK = "[ตัวอย่าง]";

/**
 * The CSS class of every menu item the dataset makes. The Homepage renders no class of a menu item
 * (src/lib/homepage-curation.ts).
 */
export const DEMO_MENU_CLASS = "demo-dataset";

/** A taxonomy term, as the native taxonomy API creates it. */
export interface DemoTerm {
	taxonomy: string;
	slug: string;
	label: string;
}

/**
 * A picture or a PDF of the dataset, uploaded under its filename. A picture is a diagonal blend of
 * two hex colours, with alt text in the media library.
 */
export type DemoMedia =
	{ filename: string; alt: string; colours: readonly [string, string] } | { filename: string };

/**
 * A field value that stands for a media item of the dataset, by filename. `add` gives the field the
 * uploaded item instead: `{ id }` for a picture, the file value for a PDF.
 */
export interface MediaRef {
	demoMedia: string;
}

/** An entry of the dataset, as `add` creates it. */
export interface DemoEntry {
	collection: string;
	slug: string;
	/** Its fields, as the native content API takes them, with a MediaRef for each picture or file. */
	data: Record<string, unknown>;
	/** Its terms' slugs by taxonomy. */
	taxonomies?: Record<string, string[]>;
	/** The slugs of the dataset's entries it refers to, by reference field. */
	references?: Record<string, string[]>;
	/** When `add` publishes it. */
	publishedAt: string;
}

/** A menu item of the dataset: an entry of it by slug, as the Admin's picker adds, or a link. */
export type DemoMenuItem = { label: string; entry: string } | { label: string; url: string };

/** A value the Office Contact plugin's settings take (src/plugins/office-contact.ts). */
type SettingValue = string | number;

export interface DemoDataset {
	terms: DemoTerm[];
	media: DemoMedia[];
	entries: DemoEntry[];
	/** The Homepage menus' items, by menu name. */
	menus: Record<string, DemoMenuItem[]>;
	/** Office Contact values, by settings key. */
	officeContact: Record<string, SettingValue>;
	/** The site settings' `social` handles, by network. */
	social: Record<string, string>;
}

/** A term on the runtime. */
export interface LiveTerm {
	taxonomy: string;
	slug: string;
}

/** A media item on the runtime. */
export interface LiveMedia {
	id: string;
	filename: string;
}

/** An entry on the runtime, live or in the trash, as the native content lists give it. */
export interface LiveEntry {
	collection: string;
	id: string;
	slug: string | null;
	title: string;
	status: string;
	trashed: boolean;
}

/**
 * A menu item on the runtime, as GET /_emdash/api/menus/{name} lists it (emdash 1.1.0
 * src/api/schemas/menus.ts menuItemSchema).
 */
export interface LiveMenuItem {
	id: string;
	parentId: string | null;
	type: string;
	label: string;
	referenceCollection: string | null;
	referenceId: string | null;
	customUrl: string | null;
	cssClasses: string | null;
}

/** What the runtime holds. */
export interface LiveState {
	entries: LiveEntry[];
	terms: LiveTerm[];
	media: LiveMedia[];
	/** Each menu's items, in menu order, by menu name. */
	menus: Record<string, LiveMenuItem[]>;
	/** Office Contact values by settings key, `null` when unset. */
	officeContact: Record<string, SettingValue | null>;
	/** The `social` handles by network, empty when unset. */
	social: Record<string, string>;
}

/** What `add` does, in this order. */
export interface AddPlan {
	/** The terms to create. */
	terms: DemoTerm[];
	/** The pictures and files to upload. */
	upload: DemoMedia[];
	/** The dataset's entries to take out of the trash, which brings each back as a draft. */
	restore: LiveEntry[];
	/** The entries to create, as drafts, each after the entries it refers to. */
	create: DemoEntry[];
	/** The entries to publish, created ones included. */
	publish: DemoEntry[];
	/** The menus to give exactly these items, after taking out the items the dataset made before. */
	menus: { name: string; items: DemoMenuItem[] }[];
	/** The Office Contact values to set. */
	officeContact: Record<string, SettingValue>;
	/** The `social` handles to set. */
	social: Record<string, string>;
	/**
	 * What the dataset leaves as the office has it: an entry of the office's own at a reserved slug
	 * (as `collection/slug`), a menu that holds an item of its own, and an Office Contact value or a
	 * handle of its own.
	 */
	kept: string[];
}

/** What `remove` does, in this order. */
export interface RemovePlan {
	/** The menu items the dataset made, and any other that points at a demo entry. */
	menuItems: { menu: string; item: LiveMenuItem }[];
	/** The demo entries, live or in the trash: those live go to the trash, then all are purged. */
	entries: LiveEntry[];
	/** The demo terms, deleted once no entry uses them. */
	terms: LiveTerm[];
	/** The demo pictures and files, deleted once no entry uses them. */
	media: LiveMedia[];
	/** The Office Contact keys that still hold the dataset's values, to unset. */
	officeContact: string[];
	/** The `social` networks whose handle is still the dataset's, to empty. */
	social: string[];
}

const entryName = ({ collection, slug }: { collection: string; slug: string | null }) =>
	`${collection}/${slug}`;

const termName = ({ taxonomy, slug }: LiveTerm) => `${taxonomy}/${slug}`;

/**
 * `entries` reordered so that each comes after the entries it refers to, or that `present` holds.
 * A reference that never resolves throws.
 */
function inReferenceOrder(entries: DemoEntry[], present: Set<string>): DemoEntry[] {
	const ordered: DemoEntry[] = [];
	const done = new Set(present);
	let pending = entries;
	while (pending.length > 0) {
		const ready = pending.filter(({ references = {} }) =>
			Object.values(references).every((slugs) => slugs.every((slug) => done.has(slug))),
		);
		if (ready.length === 0) {
			throw new Error(`unresolved references: ${pending.map(({ slug }) => slug).join(", ")}`);
		}
		for (const { slug } of ready) done.add(slug);
		ordered.push(...ready);
		pending = pending.filter((entry) => !ready.includes(entry));
	}
	return ordered;
}

/**
 * Whether a runtime entry is the dataset's: its slug carries the demo prefix, or it holds a slug
 * that the dataset uses without one, a reserved Basic Page's, under a title with the demo mark.
 */
function demoEntries(dataset: DemoDataset): (entry: LiveEntry) => boolean {
	const unprefixed = new Set(
		dataset.entries.filter(({ slug }) => !slug.startsWith(DEMO_PREFIX)).map(entryName),
	);
	return (entry) =>
		(entry.slug?.startsWith(DEMO_PREFIX) ?? false) ||
		(unprefixed.has(entryName(entry)) && entry.title.startsWith(DEMO_MARK));
}

/**
 * What `add` does on a runtime in state `live`: create the dataset's terms, media and entries the
 * runtime lacks, take its entries out of the trash, and publish each one that is not published. A
 * term, media item or entry the runtime holds keeps its label, file or fields. An entry of the
 * office's own at a reserved slug stays as it is, and the dataset's entry there is left out.
 */
export function planAdd(dataset: DemoDataset, live: LiveState): AddPlan {
	const isDemo = demoEntries(dataset);
	// A slug is unique in its collection, the trash included, so the runtime holds one entry at most.
	const held = new Map(live.entries.map((entry) => [entryName(entry), entry]));
	const terms = new Set(live.terms.map(termName));
	const media = new Set(live.media.map(({ filename }) => filename));
	const plan: AddPlan = {
		terms: dataset.terms.filter((term) => !terms.has(termName(term))),
		upload: dataset.media.filter(({ filename }) => !media.has(filename)),
		restore: [],
		create: [],
		publish: [],
		menus: [],
		officeContact: {},
		social: {},
		kept: [],
	};
	for (const entry of dataset.entries) {
		const holder = held.get(entryName(entry));
		if (holder !== undefined && !isDemo(holder)) {
			plan.kept.push(entryName(entry));
			continue;
		}
		if (holder === undefined) plan.create.push(entry);
		else if (holder.trashed) plan.restore.push(holder);
		// A restored entry comes back as a draft (emdash 1.1.0 src/database/repositories/content.ts
		// restore).
		if (holder === undefined || holder.trashed || holder.status !== "published") {
			plan.publish.push(entry);
		}
	}
	const creating = new Set(plan.create);
	plan.create = inReferenceOrder(
		plan.create,
		new Set(dataset.entries.filter((entry) => !creating.has(entry)).map(({ slug }) => slug)),
	);

	/** The live id of each dataset entry outside the trash, by slug. */
	const ids = new Map(
		dataset.entries.flatMap((entry) => {
			const holder = held.get(entryName(entry));
			return holder && !holder.trashed && isDemo(holder) ? [[entry.slug, holder.id] as const] : [];
		}),
	);
	const collections = new Map(dataset.entries.map(({ slug, collection }) => [slug, collection]));
	/** An item as the menu would hold it once written, or undefined while its entry has no id. */
	const stored = (item: DemoMenuItem) => {
		if ("url" in item) return ["custom", item.label, null, null, item.url];
		const collection = collections.get(item.entry)!;
		const id = ids.get(item.entry);
		return id && [collection === "pages" ? "page" : "collection", item.label, collection, id, null];
	};
	for (const [name, items] of Object.entries(dataset.menus)) {
		const holds = live.menus[name] ?? [];
		if (holds.some(({ cssClasses }) => cssClasses !== DEMO_MENU_CLASS)) {
			plan.kept.push(`menu ${name}`);
			continue;
		}
		const wanted = items.map(stored);
		const same =
			wanted.every((fields) => fields !== undefined) &&
			JSON.stringify(wanted) ===
				JSON.stringify(
					holds.map((item) => [
						item.type,
						item.label,
						item.referenceCollection,
						item.referenceId,
						item.customUrl,
					]),
				);
		if (!same) plan.menus.push({ name, items });
	}

	for (const [key, value] of Object.entries(dataset.officeContact)) {
		const current = live.officeContact[key];
		if (current === null || current === undefined || current === "")
			plan.officeContact[key] = value;
		else if (current !== value) plan.kept.push(`Office Contact ${key}`);
	}
	for (const [network, handle] of Object.entries(dataset.social)) {
		const current = live.social[network];
		if (!current) plan.social[network] = handle;
		else if (current !== handle) plan.kept.push(`the social handle ${network}`);
	}
	return plan;
}

/**
 * What `remove` does on a runtime in state `live`: take away every demo entry, term, media item and
 * menu item, including one the dataset no longer lists, and empty the Office Contact values and
 * handles that still hold the dataset's. Nothing else is touched.
 */
export function planRemove(dataset: DemoDataset, live: LiveState): RemovePlan {
	const entries = live.entries.filter(demoEntries(dataset));
	const ids = new Set(entries.map(({ id }) => id));
	return {
		menuItems: Object.entries(live.menus).flatMap(([menu, items]) =>
			items
				.filter(
					({ cssClasses, referenceId }) =>
						cssClasses === DEMO_MENU_CLASS || (referenceId !== null && ids.has(referenceId)),
				)
				.map((item) => ({ menu, item })),
		),
		entries,
		terms: live.terms.filter(({ slug }) => slug.startsWith(DEMO_PREFIX)),
		media: live.media.filter(({ filename }) => filename.startsWith(DEMO_PREFIX)),
		officeContact: Object.keys(dataset.officeContact).filter(
			(key) => live.officeContact[key] === dataset.officeContact[key],
		),
		social: Object.keys(dataset.social).filter(
			(network) => live.social[network] === dataset.social[network],
		),
	};
}

/** Each change an AddPlan makes, in words, in order. */
export function addSteps(plan: AddPlan): string[] {
	return [
		...plan.terms.map(({ taxonomy, slug }) => `create the ${taxonomy} term ${slug}`),
		...plan.upload.map(({ filename }) => `upload ${filename}`),
		...plan.restore.map((entry) => `restore ${entryName(entry)}`),
		...plan.create.map((entry) => `create ${entryName(entry)}`),
		...plan.publish.map((entry) => `publish ${entryName(entry)}`),
		...plan.menus.map(({ name, items }) => `give the menu ${name} its ${items.length} items`),
		...Object.keys(plan.officeContact).map((key) => `set Office Contact ${key}`),
		...Object.keys(plan.social).map((network) => `set the social handle ${network}`),
	];
}

/** Each change a RemovePlan makes, in words, in order. */
export function removeSteps(plan: RemovePlan): string[] {
	return [
		...plan.menuItems.map(({ menu, item }) => `take ${item.label} out of the menu ${menu}`),
		...plan.entries.map((entry) => `delete ${entryName(entry)}`),
		...plan.terms.map(({ taxonomy, slug }) => `delete the ${taxonomy} term ${slug}`),
		...plan.media.map(({ filename }) => `delete ${filename}`),
		...plan.officeContact.map((key) => `unset Office Contact ${key}`),
		...plan.social.map((network) => `empty the social handle ${network}`),
	];
}
